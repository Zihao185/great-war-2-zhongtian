import { api } from './api.js';
import { UI } from './ui.js';
import { ITEMS, SECURITY_SURVIVAL_SECONDS, actualDamage, armorReduction, clamp, distance, lifeStealAmount, reflectBullet, segmentCircleHit, weaponAttack } from './rules.js';
import { REGIONS, createRegionEnemies, drawRegion, getInteractions } from './world.js';

const q = (selector) => document.querySelector(selector);
const canvas = q('#game-canvas');
const ctx = canvas.getContext('2d');
const emperorSwordSprite = new Image();
emperorSwordSprite.src = '/assets/characters/yang-zihao-emperor-sword-v1.png';
const keys = new Set();
let authMode = 'login';
let entryIntent = 'new';
let currentAccount = null;
let currentSave = null;
let game = null;
let gameStartSequence = 0;

function showAuth(intent) {
  entryIntent = intent;
  q('#auth-title').textContent = intent === 'continue' ? '读取中天存档' : '进入中天档案馆';
  q('#auth-copy').textContent = intent === 'continue' ? '登录后会读取最近一次帝都检查点。' : '注册或登录后，选择英雄进入中天帝都。';
  q('#auth-error').textContent = '';
  UI.showScreen('auth-screen');
}

function setAuthMode(mode) {
  authMode = mode;
  q('#login-tab').classList.toggle('active', mode === 'login'); q('#register-tab').classList.toggle('active', mode === 'register');
  q('#auth-submit span').textContent = mode === 'login' ? '登录' : '创建账号';
  q('#password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  q('#auth-error').textContent = '';
}

async function authenticate(event) {
  event.preventDefault();
  const username = q('#username').value.trim(); const password = q('#password').value;
  const button = q('#auth-submit'); button.disabled = true; q('#auth-error').textContent = '';
  try {
    const payload = authMode === 'login' ? await api.login(username, password) : await api.register(username, password);
    currentAccount = payload.account; currentSave = payload.save;
    if (!currentSave.hero || entryIntent === 'new') UI.showScreen('hero-screen');
    else startGame(currentSave);
  } catch (error) { q('#auth-error').textContent = error.message; }
  finally { button.disabled = false; }
}

async function selectYang() {
  UI.showScreen('loading-screen');
  try {
    const payload = await api.save({ hero: 'yang_zihao', region: currentSave.region, checkpoint: currentSave.checkpoint, quest: currentSave.quest, health: currentSave.health });
    currentSave = payload.save; startGame(currentSave);
  } catch (error) { UI.showScreen('hero-screen'); alert(error.message); }
}

async function logout() {
  try { await api.logout(); } catch {}
  gameStartSequence += 1;
  currentAccount = null; currentSave = null; game?.stop(); game = null; UI.showScreen('title-screen');
}

async function checkServer() {
  try { await api.health(); q('#server-status').classList.add('online'); q('#server-status').innerHTML = '<i></i> 中天档案馆在线 · 存档保存在本机'; }
  catch { q('#server-status').classList.remove('online'); q('#server-status').innerHTML = '<i></i> 中天档案馆离线'; }
}

function waitForImage(image) {
  if (image.complete) return Promise.resolve();
  return new Promise(resolve => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
  });
}

async function preloadGameAssets() {
  await waitForImage(emperorSwordSprite);
}

async function startGame(save) {
  const sequence = ++gameStartSequence;
  UI.showScreen('loading-screen');
  await preloadGameAssets();
  if (sequence !== gameStartSequence || !currentAccount) return;
  UI.showScreen('game-screen');
  game?.stop(); game = new GreatWarGame(save); game.start();
}

class GreatWarGame {
  constructor(save) {
    this.save = structuredClone(save);
    this.region = REGIONS[this.save.region] || REGIONS.platform;
    this.player = this.createPlayer();
    this.camera = { x: 0, y: 0, shake: 0 };
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.floaters = [];
    this.hazards = [];
    this.interactions = [];
    this.nearestInteraction = null;
    this.challenge = null;
    this.attackFx = null;
    this.running = true;
    this.dead = false;
    this.transitioning = false;
    this.lastTime = 0;
    this.frame = 0;
    this.saveTimer = 0;
    this.unsaved = false;
    this.roomClearNotified = false;
    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  createPlayer() {
    return {
      x: 0, y: 0, r: 18, maxHp: 160, hp: clamp(this.save.health || 160, 1, 160), speed: 265, facing: 0,
      attackCd: 0, dashCd: 0, riseCd: 0, comboWindow: 0, dragonBlood: 0, musou: 0, aura: 0,
      invuln: 0, hurt: 0, step: 0, moving: false, dashTime: 0, vx: 0, vy: 0,
      animation: { action: null, elapsed: 0, duration: 0, locked: false }, attackChain: 0, attackChainTimer: 0, dashMotion: null
    };
  }

  start() {
    window.addEventListener('resize', this.resize); window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp); window.addEventListener('blur', this.onBlur);
    this.resize(); this.loadRegion(this.save.region, false); UI.saveStatus('saved'); this.updateQuest();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false; clearTimeout(this.saveTimer); window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp); window.removeEventListener('blur', this.onBlur);
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2); const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.viewWidth = rect.width; this.viewHeight = rect.height;
  }

  loadRegion(regionId, save = true) {
    this.region = REGIONS[regionId] || REGIONS.platform; this.save.region = this.region.id; this.save.checkpoint = this.region.checkpoint;
    const spawn = this.region.spawn; this.player.x = spawn.x; this.player.y = spawn.y; this.player.vx = 0; this.player.vy = 0;
    this.player.moving = false; this.player.dashMotion = null; this.player.attackChain = 0; this.player.attackChainTimer = 0;
    this.player.animation = { action: null, elapsed: 0, duration: 0, locked: false };
    this.enemies = createRegionEnemies(this.region.id); this.bullets = []; this.hazards = []; this.particles = []; this.roomClearNotified = false;
    this.interactions = getInteractions(this.region.id); this.nearestInteraction = null;
    this.challenge = this.region.id === 'security' && this.save.quest === 'security_active' ? { active: true, time: 0, shotCd: .8, resets: 0 } : null;
    this.camera.x = clamp(this.player.x - this.viewWidth / 2, 0, Math.max(0, this.region.width - this.viewWidth));
    this.camera.y = clamp(this.player.y - this.viewHeight / 2, 0, Math.max(0, this.region.height - this.viewHeight));
    this.updateQuest(); UI.toast(this.region.name, 'cyan', 1.8); if (save) this.autosave();
  }

  async transition(target) {
    if (this.transitioning) return; this.transitioning = true; UI.setPrompt(''); UI.transition(REGIONS[target]?.name || target, true);
    await new Promise(resolve => setTimeout(resolve, 320)); this.loadRegion(target, true);
    await new Promise(resolve => setTimeout(resolve, 180)); UI.transition('', false); this.transitioning = false;
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','j','k','l','f','escape'].includes(key)) event.preventDefault();
    if (event.repeat) { keys.add(key); return; }
    keys.add(key);
    if (key === 'escape' && UI.modalOpen()) UI.closeModal();
    else if (key === 'f') this.interact();
    else if (key === ' ') this.basicAttack();
    else if (key === 'j') this.castDash();
    else if (key === 'k') this.castRisingDragon();
    else if (key === 'l') this.castImperialAura();
  }

  onKeyUp(event) { keys.delete(event.key.toLowerCase()); }
  onBlur() { keys.clear(); }

  hasSword() { return Boolean(this.save.equipped?.weapon); }
  canAct() { return !this.dead && !this.transitioning && !UI.dialogueOpen() && !UI.modalOpen(); }

  interact() {
    if (UI.dialogueOpen()) { UI.advanceDialogue(); return; }
    if (!this.canAct()) return;
    const target = this.nearestInteraction; if (!target) return;
    if (target.type === 'npc') return this.talkToWang();
    if (target.type === 'shop') return UI.renderShop(this.save);
    if (target.type === 'forge') return UI.renderForge(this.save);
    if (target.type === 'teleporter') return this.openTeleporter();
    if (target.type === 'locked') return UI.toast(`${target.number} 号楼仍被帝都封印`, 'red');
    if (target.type === 'portal') {
      if (target.id === 'security_gate' && this.save.quest === 'intro') return UI.toast('先与王子毅领取“神的开始”', 'red');
      if (target.id === 'building2_gate' && this.save.quest !== 'building2_active') return UI.toast('获得帝王剑后，王子毅才会开放 2 号楼', 'red');
      if (target.requiresClear && this.enemies.some(enemy => !enemy.dead)) return UI.toast('封锁尚未解除：清理当前区域', 'red');
      return this.transition(target.target);
    }
  }

  talkToWang() {
    const quest = this.save.quest;
    if (quest === 'intro') {
      UI.showDialogue({ pages: ['杨子豪，中天九楼在今夜同时失去回应。你来得正是时候。', `但帝王剑不属于未经试炼的人。去西南保安处，在反弹弹幕中连续坚持 ${SECURITY_SURVIVAL_SECONDS} 秒。`, '一旦被子弹碰到，试炼就会从头开始。回来时，我会让你握住真正的帝王之锋。'], onComplete: () => { this.save.quest = 'security_active'; this.updateQuest(); this.autosave(); UI.toast('使命开启：神的开始'); } });
    } else if (quest === 'security_active') {
      UI.showDialogue({ pages: ['保安处就在帝都西南。子弹会在墙壁之间反弹，不要只看枪口，也要看它下一次撞墙后的方向。'] });
    } else if (quest === 'security_complete') {
      UI.showDialogue({ pages: ['整整六十秒，弹幕没有触及你的衣角。很好。', '这把剑曾在帝都最黑暗的夜里发出第一道光。现在，它承认你了。'], onComplete: () => this.awardImperialSword() });
    } else {
      UI.showDialogue({ pages: ['2 号楼的灯一直亮着，但里面已经没有活人的脚步声。', '子狗占据了顶层犬神办公室。穿过失序大厅与回声走廊，带回帝都的秩序。'] });
    }
  }

  async awardImperialSword() {
    try {
      const payload = await api.action({ type: 'award_sword' }); this.save = payload.save;
      UI.toast('获得帝王剑 · 普攻与技能已解锁', 'gold', 3.2); this.burst(this.player.x, this.player.y, '#ffe18a', 35, 230, .9);
      this.save.quest = 'building2_active'; this.updateQuest(); await this.autosave(true);
    } catch (error) { UI.toast(error.message, 'red'); }
  }

  openTeleporter() {
    const buildingReady = this.save.quest === 'building2_active';
    UI.openModal('ZHONGTIAN TRANSFER ARRAY', '台子 · 区域传送', `<div class="forge-actions"><article><small>西南禁区</small><h3>保安处</h3><p>反弹弹幕训练场。</p><button data-action="teleport" data-item="security">传送</button></article><article><small>当前开放副本</small><h3>2 号楼</h3><p>失序大厅、回声走廊、犬神办公室。</p><button data-action="teleport" data-item="building2_floor1" ${buildingReady ? '' : 'disabled'}>${buildingReady ? '传送' : '尚未解锁'}</button></article></div>`);
  }

  basicAttack() {
    if (!this.canAct() || !this.hasSword()) { if (this.canAct()) UI.toast('你还没有武器', 'red'); return; }
    const p = this.player; if (p.attackCd > 0 || p.animation.locked) return;
    p.attackChain = p.attackChainTimer > 0 ? p.attackChain % 3 + 1 : 1;
    p.attackChainTimer = .75;
    p.attackCd = p.aura > 0 ? .27 : .54;
    this.startPlayerAnimation(`attack_${p.attackChain}`, p.attackCd, true);
    const start = { x: p.x, y: p.y }; const end = { x: p.x + Math.cos(p.facing) * 94, y: p.y + Math.sin(p.facing) * 94 };
    let hits = 0; const damage = weaponAttack(this.save);
    for (const enemy of this.enemies.filter(enemy => !enemy.dead)) {
      const angle = Math.abs(Math.atan2(Math.sin(Math.atan2(enemy.y-p.y,enemy.x-p.x)-p.facing),Math.cos(Math.atan2(enemy.y-p.y,enemy.x-p.x)-p.facing)));
      if (segmentCircleHit(start,end,enemy,38) && angle < 1.1) { this.hitEnemy(enemy,damage,p.facing); hits += 1; }
    }
    if (hits) {
      p.musou = Math.min(100,p.musou+10);
      const dragonBloodActive = p.dragonBlood > 0;
      const imperialAuraActive = p.aura > 0;
      if (dragonBloodActive) p.dragonBlood -= 1;
      if (dragonBloodActive || imperialAuraActive) this.healPlayer(lifeStealAmount(this.save), dragonBloodActive ? '龙血' : '帝气');
    }
    this.attackFx = { type:'arc', time:.30, max:.30, facing:p.facing, color:p.aura>0?'#fff0a0':'#e7c66e' };
    this.burst(end.x,end.y,p.aura>0?'#fff2aa':'#e5bd63',8,110,.32);
  }

  castDash() {
    if (!this.canAct() || !this.hasSword()) { if (this.canAct()) UI.toast('帝王剑尚未入手', 'red'); return; }
    const p=this.player;if(p.dashCd>0||p.animation.locked)return;const start={x:p.x,y:p.y};const end={x:clamp(p.x+Math.cos(p.facing)*260,35,this.region.width-35),y:clamp(p.y+Math.sin(p.facing)*260,35,this.region.height-35)};
    for(const enemy of this.enemies.filter(enemy=>!enemy.dead))if(segmentCircleHit(start,end,enemy,24))this.hitEnemy(enemy,weaponAttack(this.save),p.facing);
    p.dashMotion={start,end,elapsed:0,duration:.18};p.dashCd=3;p.comboWindow=.8;p.invuln=.22;this.startPlayerAnimation('dash',.44,true);this.attackFx={type:'dash',time:.44,max:.44,start,end,color:'#75e3cd'};this.burst(start.x,start.y,'#67d7c1',18,170,.5);this.camera.shake=3;
  }

  castRisingDragon() {
    if (!this.canAct() || !this.hasSword()) { if (this.canAct()) UI.toast('帝王剑尚未入手', 'red'); return; }
    const p=this.player;if(p.riseCd>0||p.animation.locked)return;const combo=p.comboWindow>0;const end={x:p.x+Math.cos(p.facing)*115,y:p.y+Math.sin(p.facing)*115};let hit=false;
    for(const enemy of this.enemies.filter(enemy=>!enemy.dead))if(segmentCircleHit(p,end,enemy,48)){this.hitEnemy(enemy,Math.round(weaponAttack(this.save)*1.18),p.facing);enemy.airborne=combo?1.05:.42;hit=true;}
    p.riseCd=5;p.comboWindow=0;this.startPlayerAnimation(combo?'rise_combo':'rise',.50,true);if(combo){p.dashCd=0;p.dragonBlood=3;UI.toast('连招成立 · 突进刷新 · 龙血三层','cyan');}else if(hit)UI.toast('升龙命中');
    this.attackFx={type:'rise',time:.58,max:.58,facing:p.facing,color:combo?'#ffe28a':'#75dbc5',combo};this.burst(end.x,end.y,combo?'#ffe38a':'#6bdac5',22,210,.65);this.camera.shake=6;
  }

  castImperialAura() {
    if (!this.canAct() || !this.hasSword()) return; const p=this.player;
    if(p.aura>0||p.animation.locked)return;if(p.musou<100){UI.toast(`无双尚未满盈：${Math.floor(p.musou)} / 100`,'red');return;}
    p.aura=5;this.startPlayerAnimation('aura_cast',.35,true);this.burst(p.x,p.y,'#ffe08a',45,260,1.1);UI.toast('帝气 · 中天帝王之气降临','gold',3);this.camera.shake=8;
  }

  hitEnemy(enemy,damage,angle) {
    if(enemy.dead)return;enemy.hp-=damage;enemy.hitFlash=.16;enemy.vx+=Math.cos(angle)*180;enemy.vy+=Math.sin(angle)*180;this.addFloater(enemy.x,enemy.y-enemy.r-12,`-${damage}`,'#ffe08a');this.burst(enemy.x,enemy.y,'#e6bd61',10,145,.42);this.camera.shake=Math.max(this.camera.shake,3);
    if(enemy.hp<=0)this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    if(enemy.dead)return;enemy.dead=true;this.burst(enemy.x,enemy.y,enemy.boss?'#d84d4c':'#98d7c5',enemy.boss?55:22,enemy.boss?300:190,.9);this.addFloater(enemy.x,enemy.y-enemy.r-18,enemy.boss?'子狗伏诛':'击破',enemy.boss?'#ff8b79':'#bdebdc',enemy.boss?22:14);
    if(enemy.boss)this.completeBoss();else api.enemyDefeat(enemy.goldType).then(({save,result})=>{this.save=save;UI.toast(result.message,'cyan',1.2);}).catch(()=>{this.unsaved=true;UI.saveStatus('offline');});
  }

  async completeBoss() {
    try {
      const payload=await api.bossClear();this.save=payload.save;this.save.health=this.player.hp;UI.showBossLoot(payload.result);UI.saveStatus('saved');
    }catch(error){UI.toast(error.message,'red');}
  }

  healPlayer(amount,source) { const before=this.player.hp;this.player.hp=Math.min(this.player.maxHp,this.player.hp+amount);if(this.player.hp>before)this.addFloater(this.player.x,this.player.y-38,`+${this.player.hp-before} ${source}`,'#7ee0bd'); }

  damagePlayer(baseDamage) {
    const p=this.player;if(p.invuln>0||this.dead)return;const damage=actualDamage(baseDamage,armorReduction(this.save),p.aura>0);p.hp=Math.max(0,p.hp-damage);p.invuln=.68;p.hurt=.2;this.camera.shake=7;this.addFloater(p.x,p.y-32,`-${damage}`,'#ff766b');this.burst(p.x,p.y,'#e14f49',14,160,.5);
    if(p.hp<=0){this.dead=true;p.animation={action:'dead',elapsed:0,duration:Infinity,locked:true};keys.clear();UI.showDefeat(true);}else{this.startPlayerAnimation('hurt',.2,false);this.save.health=p.hp;this.autosave();}
  }

  respawn() {
    this.dead=false;this.player.hp=this.player.maxHp;this.player.musou=0;this.player.aura=0;this.player.dragonBlood=0;UI.showDefeat(false);this.loadRegion(this.save.region,false);this.save.health=this.player.maxHp;this.autosave();UI.toast('帝气未绝 · 返回检查点','cyan');
  }

  startPlayerAnimation(action, duration, locked = true) {
    this.player.animation = { action, elapsed: 0, duration, locked };
  }

  advancePlayerAnimation(dt) {
    const p = this.player;
    p.attackChainTimer = Math.max(0, p.attackChainTimer - dt);
    if (p.attackChainTimer === 0) p.attackChain = 0;
    if (p.dashMotion) {
      p.dashMotion.elapsed += dt;
      const t = Math.min(1, p.dashMotion.elapsed / p.dashMotion.duration);
      const eased = t * t * (3 - 2 * t);
      p.x = p.dashMotion.start.x + (p.dashMotion.end.x - p.dashMotion.start.x) * eased;
      p.y = p.dashMotion.start.y + (p.dashMotion.end.y - p.dashMotion.start.y) * eased;
      if (t === 1) p.dashMotion = null;
    }
    if (!p.animation.action) return;
    p.animation.elapsed += dt;
    if (p.animation.elapsed >= p.animation.duration) p.animation = { action: null, elapsed: 0, duration: 0, locked: false };
  }

  update(dt,time) {
    const p=this.player;
    p.attackCd=Math.max(0,p.attackCd-dt);p.dashCd=Math.max(0,p.dashCd-dt);p.riseCd=Math.max(0,p.riseCd-dt);p.comboWindow=Math.max(0,p.comboWindow-dt);p.invuln=Math.max(0,p.invuln-dt);p.hurt=Math.max(0,p.hurt-dt);
    this.advancePlayerAnimation(dt);
    if(p.aura>0){p.aura=Math.max(0,p.aura-dt);if(p.aura===0)p.musou=0;}
    if(this.attackFx){this.attackFx.time-=dt;if(this.attackFx.time<=0)this.attackFx=null;}
    this.updateParticles(dt);this.updateBullets(dt);this.updateHazards(dt);
    if(this.canAct())this.updateMovement(dt);
    if(!this.dead&&!this.transitioning){if(this.challenge?.active)this.updateChallenge(dt);for(const enemy of this.enemies.filter(enemy=>!enemy.dead))this.updateEnemy(enemy,dt);}
    this.updateInteraction();this.updateCamera(dt);this.updateQuest();UI.renderHud({save:this.save,player:p,region:this.region,challenge:this.challenge,boss:this.enemies.find(e=>e.boss&&!e.dead)});
  }

  updateMovement(dt) {
    const p=this.player;if(p.animation.locked){p.moving=false;return;}let dx=0,dy=0;if(keys.has('w')||keys.has('arrowup'))dy-=1;if(keys.has('s')||keys.has('arrowdown'))dy+=1;if(keys.has('a')||keys.has('arrowleft'))dx-=1;if(keys.has('d')||keys.has('arrowright'))dx+=1;
    p.moving=Boolean(dx||dy);if(p.moving){const len=Math.hypot(dx,dy);dx/=len;dy/=len;p.x+=dx*p.speed*dt;p.y+=dy*p.speed*dt;p.facing=Math.atan2(dy,dx);p.step+=dt*13;}
    p.x=clamp(p.x,38,this.region.width-38);p.y=clamp(p.y,38,this.region.height-38);
  }

  updateChallenge(dt) {
    const c=this.challenge;c.time+=dt;c.shotCd-=dt;
    if(c.shotCd<=0){c.shotCd=Math.max(.34,.9-c.time*.006);this.fireSecurityBullet();if(c.time>25&&Math.random()<.25)this.fireSecurityBullet();}
    if(c.time>=SECURITY_SURVIVAL_SECONDS){c.active=false;this.bullets=[];this.save.quest='security_complete';this.updateQuest();this.autosave(true);UI.toast('“神的开始”完成 · 回台子向王子毅复命','gold',4);this.burst(this.player.x,this.player.y,'#ffe18a',45,260,1);}
  }

  fireSecurityBullet() {
    const side=Math.floor(Math.random()*4);const bounds={x:65,y:65,w:1190,h:730};let x,y;
    if(side===0){x=bounds.x+10;y=bounds.y+Math.random()*bounds.h;}else if(side===1){x=bounds.x+bounds.w-10;y=bounds.y+Math.random()*bounds.h;}else if(side===2){x=bounds.x+Math.random()*bounds.w;y=bounds.y+10;}else{x=bounds.x+Math.random()*bounds.w;y=bounds.y+bounds.h-10;}
    const angle=Math.atan2(this.player.y-y,this.player.x-x)+(Math.random()-.5)*.18;const speed=230+Math.min(110,this.challenge.time*1.4);this.bullets.push({x,y,r:7,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,bounces:0,life:15,kind:'security',color:'#ff7564'});
  }

  resetChallenge() {
    const c=this.challenge;if(!c?.active)return;c.time=0;c.resets+=1;c.shotCd=1;this.bullets=[];this.player.x=this.region.spawn.x;this.player.y=this.region.spawn.y;this.player.invuln=1;UI.toast(`被反弹子弹命中 · 计时重置（第 ${c.resets} 次）`,'red',2.7);this.camera.shake=9;
  }

  updateEnemy(enemy,dt) {
    enemy.hitFlash=Math.max(0,enemy.hitFlash-dt);enemy.attackCd=Math.max(0,enemy.attackCd-dt);enemy.airborne=Math.max(0,enemy.airborne-dt);enemy.phaseTimer-=dt;
    if(enemy.airborne>0)return;const p=this.player;const dx=p.x-enemy.x,dy=p.y-enemy.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
    if(enemy.boss){
      const phase2=enemy.hp<=enemy.maxHp/2;
      if(phase2&&enemy.phaseTimer<=0){enemy.phaseTimer=2.8;this.hazards.push({x:p.x,y:p.y,r:145,time:1.15,max:1.15,damage:30,triggered:false});UI.toast('子狗正在召唤冲刺幻影','red',1.2);}
      if(d>enemy.r+p.r+25){const boost=phase2?1.42:1;enemy.vx+=ux*enemy.speed*boost*dt*4;enemy.vy+=uy*enemy.speed*boost*dt*4;}
      else if(enemy.attackCd<=0){enemy.attackCd=phase2?.72:1.05;this.damagePlayer(enemy.damage+(phase2?6:0));enemy.vx-=ux*170;enemy.vy-=uy*170;}
    }else if(enemy.ranged){
      if(d>360){enemy.vx+=ux*enemy.speed*dt*3;enemy.vy+=uy*enemy.speed*dt*3;}else if(d<230){enemy.vx-=ux*enemy.speed*dt*2.5;enemy.vy-=uy*enemy.speed*dt*2.5;}
      if(enemy.attackCd<=0&&d<520){enemy.attackCd=1.7;this.bullets.push({x:enemy.x,y:enemy.y,r:6,vx:ux*260,vy:uy*260,bounces:0,life:5,kind:'enemy',damage:enemy.damage,color:'#a96ddd'});}
    }else{if(d>enemy.r+p.r+10){enemy.vx+=ux*enemy.speed*dt*4;enemy.vy+=uy*enemy.speed*dt*4;}else if(enemy.attackCd<=0){enemy.attackCd=1.08;this.damagePlayer(enemy.damage);enemy.vx-=ux*120;enemy.vy-=uy*120;}}
    enemy.vx*=Math.pow(.005,dt);enemy.vy*=Math.pow(.005,dt);enemy.x=clamp(enemy.x+enemy.vx*dt,70,this.region.width-70);enemy.y=clamp(enemy.y+enemy.vy*dt,70,this.region.height-70);
  }

  updateBullets(dt) {
    const bounds={x:65,y:65,w:this.region.width-130,h:this.region.height-130};
    for(const bullet of this.bullets){bullet.life-=dt;bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;if(bullet.kind==='security')reflectBullet(bullet,bounds);if(bullet.bounces>4)bullet.life=0;if(Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y)<bullet.r+this.player.r){bullet.life=0;if(bullet.kind==='security')this.resetChallenge();else this.damagePlayer(bullet.damage||12);}}
    this.bullets=this.bullets.filter(b=>b.life>0&&b.x>-100&&b.x<this.region.width+100&&b.y>-100&&b.y<this.region.height+100);
  }

  updateHazards(dt) {
    for(const h of this.hazards){h.time-=dt;if(h.time<=0&&!h.triggered){h.triggered=true;if(distance(h,this.player)<h.r)this.damagePlayer(h.damage);this.burst(h.x,h.y,'#df5a52',28,250,.7);this.camera.shake=8;}}
    this.hazards=this.hazards.filter(h=>h.time>-.35);
  }

  updateParticles(dt) {for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.06,dt);p.vy*=Math.pow(.06,dt);}this.particles=this.particles.filter(p=>p.life>0);for(const f of this.floaters){f.life-=dt;f.y-=35*dt;}this.floaters=this.floaters.filter(f=>f.life>0);}
  burst(x,y,color,count,speed,life){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=speed*(.25+Math.random()*.75);this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:1+Math.random()*3,life,max:life,color});}}
  addFloater(x,y,text,color,size=14){this.floaters.push({x,y,text,color,size,life:.8,max:.8});}

  updateInteraction() {
    if(this.dead||this.transitioning||UI.dialogueOpen()||UI.modalOpen()){this.nearestInteraction=null;UI.setPrompt('');return;}
    let nearest=null,best=Infinity;for(const interaction of this.interactions){const d=distance(this.player,interaction);if(d<interaction.radius&&d<best){nearest=interaction;best=d;}}
    if(nearest?.requiresClear&&this.enemies.some(enemy=>!enemy.dead))nearest={...nearest,label:'出口封锁 · 清理当前区域'};
    this.nearestInteraction=nearest;UI.setPrompt(nearest?.label||'');
    const alive=this.enemies.filter(e=>!e.dead);if(!alive.length&&this.enemies.length&&!this.roomClearNotified&&this.region.id!=='building2_boss'){this.roomClearNotified=true;UI.toast('区域肃清 · 通往下一层的封锁解除','cyan',2.4);}
  }

  updateCamera(dt) {const targetX=clamp(this.player.x-this.viewWidth*.5,0,Math.max(0,this.region.width-this.viewWidth)),targetY=clamp(this.player.y-this.viewHeight*.53,0,Math.max(0,this.region.height-this.viewHeight));this.camera.x+=(targetX-this.camera.x)*Math.min(1,dt*5);this.camera.y+=(targetY-this.camera.y)*Math.min(1,dt*5);this.camera.shake=Math.max(0,this.camera.shake-dt*24);}

  updateQuest() {
    const qst=this.save.quest;let title,copy;
    if(qst==='intro'){title='风起中天';copy='在台子上寻找王子毅，领取第一道使命。';}
    else if(qst==='security_active'){title='神的开始';copy=this.region.id==='security'?`在反弹弹幕中连续 ${SECURITY_SURVIVAL_SECONDS} 秒不受伤。`:'前往帝都西南的保安处，接受无伤试炼。';}
    else if(qst==='security_complete'){title='神的开始 · 复命';copy='试炼完成，回台子向王子毅领取初始装备。';}
    else{title='2 号楼：犬神办公室';copy=this.region.id.startsWith('building2')?'清理当前楼层，向顶层的子狗推进。':'从台子南侧进入 2 号楼，击败最终首领子狗。';}
    UI.setQuest(title,copy);
  }

  async autosave(immediate=false) {
    this.unsaved=true;UI.saveStatus('saving');clearTimeout(this.saveTimer);
    const write=async()=>{try{const payload=await api.save({hero:this.save.hero,region:this.save.region,checkpoint:this.save.checkpoint,quest:this.save.quest,health:Math.max(1,Math.round(this.player.hp)),unlockedRegions:this.save.unlockedRegions});this.save={...this.save,...payload.save};this.unsaved=false;UI.saveStatus('saved');}catch{this.unsaved=true;UI.saveStatus(navigator.onLine?'error':'offline');}};
    if(immediate)return write();this.saveTimer=setTimeout(write,650);
  }

  render(time) {
    const w=this.viewWidth,h=this.viewHeight;ctx.clearRect(0,0,w,h);const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#08151d');sky.addColorStop(1,'#0b171a');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    const sx=this.camera.shake?(Math.random()-.5)*this.camera.shake:0,sy=this.camera.shake?(Math.random()-.5)*this.camera.shake:0;ctx.save();ctx.translate(-this.camera.x+sx,-this.camera.y+sy);drawRegion(ctx,this.region.id,time);
    this.drawInteractions(time);for(const hazard of this.hazards)this.drawHazard(hazard);for(const bullet of this.bullets)this.drawBullet(bullet,time);
    const entities=[...this.enemies.filter(e=>!e.dead),{...this.player,type:'player'}].sort((a,b)=>a.y-b.y);for(const entity of entities)entity.type==='player'?this.drawPlayer(entity,time):this.drawEnemy(entity,time);
    this.drawAttackFx();this.drawParticles();this.drawFloaters();ctx.restore();this.drawAtmosphere(w,h,time);this.drawMiniMap(w,h);
  }

  drawInteractions(time) {
    for(const item of this.interactions.filter(i=>['portal','teleporter'].includes(i.type))){const unlocked=!(item.id==='building2_gate'&&this.save.quest!=='building2_active');ctx.strokeStyle=unlocked?'rgba(105,224,196,.55)':'rgba(211,80,70,.4)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(item.x,item.y,28+Math.sin(time*3+item.x)*4,0,Math.PI*2);ctx.stroke();ctx.fillStyle=unlocked?'rgba(105,224,196,.12)':'rgba(211,80,70,.1)';ctx.beginPath();ctx.arc(item.x,item.y,22,0,Math.PI*2);ctx.fill();}
  }

  drawPlayer(p,time) {
    const bob=Math.sin(p.step)*2;ctx.save();ctx.translate(p.x,p.y);if(p.aura>0){const g=ctx.createRadialGradient(0,0,8,0,0,75);g.addColorStop(0,'rgba(255,217,112,.26)');g.addColorStop(1,'rgba(255,217,112,0)');ctx.fillStyle=g;ctx.fillRect(-80,-80,160,160);ctx.strokeStyle=`rgba(255,226,134,${.45+Math.sin(time*7)*.18})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,38+Math.sin(time*5)*4,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(0,20,25,9,0,0,Math.PI*2);ctx.fill();if(p.invuln>0&&Math.floor(p.invuln*18)%2===0)ctx.globalAlpha=.45;
    ctx.fillStyle='#245a67';ctx.beginPath();ctx.moveTo(-18,20);ctx.lineTo(-13,-19+bob);ctx.lineTo(12,-19+bob);ctx.lineTo(20,20);ctx.closePath();ctx.fill();ctx.strokeStyle=p.aura>0?'#ffe18a':'#d4a94f';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#c9916c';ctx.beginPath();ctx.arc(0,-29+bob,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#20262a';ctx.beginPath();ctx.arc(-1,-35+bob,14,Math.PI,0);ctx.fill();
    ctx.save();ctx.rotate(p.facing);if(emperorSwordSprite.complete&&emperorSwordSprite.naturalWidth){ctx.drawImage(emperorSwordSprite,9,-10,74,37);}else{ctx.fillStyle='#bb9143';ctx.fillRect(10,-4,27,4);ctx.fillStyle=p.aura>0?'#fff2b0':'#e9e2d1';ctx.beginPath();ctx.moveTo(34,-7);ctx.lineTo(62,-2);ctx.lineTo(34,4);ctx.closePath();ctx.fill();}ctx.restore();
    ctx.restore();
  }

  drawEnemy(e,time) {
    ctx.save();ctx.translate(e.x,e.y);const lift=e.airborne>0?Math.sin(Math.min(1,e.airborne)*Math.PI)*38:0;ctx.translate(0,-lift);ctx.fillStyle='rgba(0,0,0,.38)';ctx.beginPath();ctx.ellipse(0,e.r*.7,e.r*1.2,e.r*.38,0,0,Math.PI*2);ctx.fill();
    if(e.boss){const frenzy=e.hp<=e.maxHp/2;const g=ctx.createRadialGradient(0,0,8,0,0,85);g.addColorStop(0,frenzy?'rgba(227,69,67,.27)':'rgba(179,91,66,.18)');g.addColorStop(1,'rgba(210,60,60,0)');ctx.fillStyle=g;ctx.fillRect(-90,-90,180,180);ctx.fillStyle=e.hitFlash?'#fff1dc':'#72343b';ctx.beginPath();ctx.ellipse(0,0,55,39,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a55d45';ctx.beginPath();ctx.arc(27,-25,30,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2b191c';ctx.beginPath();ctx.moveTo(7,-46);ctx.lineTo(14,-76);ctx.lineTo(31,-50);ctx.moveTo(36,-51);ctx.lineTo(59,-70);ctx.lineTo(57,-36);ctx.fill();ctx.fillStyle='#ffc55e';ctx.fillRect(34,-29,6,5);ctx.fillStyle='#d8c6aa';ctx.beginPath();ctx.moveTo(53,-10);ctx.lineTo(70,-2);ctx.lineTo(54,5);ctx.closePath();ctx.fill();ctx.font='700 15px serif';ctx.fillStyle='#f1d5c1';ctx.textAlign='center';ctx.fillText('子狗',0,-83);
    }else{const ranged=e.ranged;ctx.fillStyle=e.hitFlash?'#f5fff9':ranged?'#57427a':'#375b5b';ctx.beginPath();ctx.moveTo(-e.r,e.r);ctx.lineTo(-e.r*.65,-e.r);ctx.lineTo(e.r*.65,-e.r);ctx.lineTo(e.r,e.r);ctx.closePath();ctx.fill();ctx.strokeStyle=ranged?'#a884d1':'#6fc8b5';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#252c2e';ctx.beginPath();ctx.arc(0,-e.r-6,e.r*.65,0,Math.PI*2);ctx.fill();ctx.fillStyle=ranged?'#cf9dfa':'#83dec7';ctx.fillRect(-7,-e.r-8,4,3);ctx.fillRect(4,-e.r-8,4,3);ctx.font='10px sans-serif';ctx.fillStyle='#c9d3cf';ctx.textAlign='center';ctx.fillText(e.name,0,-e.r-28);}
    const width=e.boss?100:48;ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(-width/2,-e.r-(e.boss?60:39),width,6);ctx.fillStyle=e.boss?'#d84f4d':'#6bc6b1';ctx.fillRect(-width/2+1,-e.r-(e.boss?59:38),(width-2)*Math.max(0,e.hp/e.maxHp),4);ctx.restore();
  }

  drawBullet(b,time) {const g=ctx.createRadialGradient(b.x,b.y,1,b.x,b.y,b.r*4);g.addColorStop(0,b.color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(b.x-b.r*4,b.y-b.r*4,b.r*8,b.r*8);ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.r+Math.sin(time*10+b.x)*1.2,0,Math.PI*2);ctx.fill();if(b.kind==='security'){ctx.strokeStyle='rgba(255,185,147,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,b.r+5,0,Math.PI*2);ctx.stroke();}}
  drawHazard(h){const progress=Math.max(0,h.time/h.max);ctx.fillStyle=`rgba(220,67,66,${h.triggered?.24:.07})`;ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgba(255,102,83,${.4+progress*.5})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(h.x,h.y,h.r*(1-progress*.55),0,Math.PI*2);ctx.stroke();}
  drawAttackFx(){
    const fx=this.attackFx;if(!fx)return;const progress=1-fx.time/fx.max;ctx.save();ctx.globalCompositeOperation='lighter';
    if(fx.type==='arc'){
      ctx.translate(this.player.x,this.player.y);ctx.rotate(fx.facing);ctx.strokeStyle=fx.color;ctx.globalAlpha=1-progress;ctx.lineWidth=7-progress*4;ctx.beginPath();ctx.arc(0,0,55+progress*45,-.9,.9);ctx.stroke();
    }else if(fx.type==='dash'){
      const dx=fx.end.x-fx.start.x,dy=fx.end.y-fx.start.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);ctx.translate(fx.start.x,fx.start.y);ctx.rotate(angle);ctx.globalAlpha=.9*(1-progress);
      for(let lane=-1;lane<=1;lane++){ctx.strokeStyle=lane===0?'#d6fff4':fx.color;ctx.lineWidth=lane===0?7:3;ctx.beginPath();ctx.moveTo(-36-progress*50,lane*8);ctx.lineTo(length+20-progress*length*.38,lane*13);ctx.stroke();}
      const flash=ctx.createRadialGradient(length+12,0,2,length+12,0,34);flash.addColorStop(0,'rgba(220,255,248,.95)');flash.addColorStop(1,'rgba(85,220,196,0)');ctx.fillStyle=flash;ctx.fillRect(length-22,-34,68,68);
    }else{
      ctx.translate(this.player.x,this.player.y);ctx.rotate(fx.facing);ctx.globalAlpha=.9*(1-progress);const color=fx.combo?'#ffe28a':fx.color;
      for(let lane=0;lane<3;lane++){ctx.strokeStyle=lane===0?'#fff5bb':color;ctx.lineWidth=lane===0?7:3;ctx.beginPath();ctx.moveTo(10+lane*7,20);ctx.quadraticCurveTo(62+lane*12,-92-progress*50,118+lane*10,-4);ctx.stroke();}
      const column=ctx.createLinearGradient(42,24,88,-140);column.addColorStop(0,'rgba(104,224,197,0)');column.addColorStop(.42,fx.combo?'rgba(255,221,120,.52)':'rgba(104,224,197,.48)');column.addColorStop(1,'rgba(235,255,244,0)');ctx.fillStyle=column;ctx.beginPath();ctx.moveTo(34,18);ctx.lineTo(76,-148-progress*42);ctx.lineTo(100,8);ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
  drawParticles(){for(const p of this.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  drawFloaters(){ctx.textAlign='center';for(const f of this.floaters){ctx.globalAlpha=Math.max(0,f.life/f.max);ctx.font=`700 ${f.size}px sans-serif`;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.lineWidth=3;ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;}
  drawAtmosphere(w,h,time){const fog=ctx.createLinearGradient(0,h*.55,0,h);fog.addColorStop(0,'rgba(54,92,88,0)');fog.addColorStop(1,'rgba(36,72,69,.2)');ctx.fillStyle=fog;ctx.fillRect(0,0,w,h);ctx.fillStyle=`rgba(115,220,200,${.018+Math.sin(time*.5)*.006})`;for(let i=0;i<5;i++)ctx.fillRect(((time*16+i*290)% (w+350))-200,0,110,h);}
  drawMiniMap(w,h){if(this.region.id!=='platform')return;const mw=145,mh=100,x=w-165,y=h-135;ctx.fillStyle='rgba(5,12,15,.78)';ctx.fillRect(x,y,mw,mh);ctx.strokeStyle='rgba(226,190,108,.3)';ctx.strokeRect(x,y,mw,mh);for(const b of [{x:620,y:420,n:'9'},{x:1800,y:390,n:'8'},{x:2940,y:440,n:'7'},{x:650,y:1140,n:'6'},{x:1800,y:900,n:'5'},{x:2940,y:1160,n:'4'},{x:650,y:1840,n:'3'},{x:1800,y:1990,n:'2'},{x:2940,y:1910,n:'1'}]){ctx.fillStyle=b.n==='2'?'#d9b659':'#496c69';ctx.fillRect(x+b.x/3600*mw-5,y+b.y/2500*mh-4,10,8);ctx.fillStyle='#d8d5c6';ctx.font='7px sans-serif';ctx.fillText(b.n,x+b.x/3600*mw,y+b.y/2500*mh-6);}ctx.fillStyle='#f1d273';ctx.beginPath();ctx.arc(x+this.player.x/3600*mw,y+this.player.y/2500*mh,3,0,Math.PI*2);ctx.fill();}

  loop(timestamp) {if(!this.running)return;const dt=Math.min(.05,(timestamp-this.lastTime)/1000||0);this.lastTime=timestamp;this.update(dt,timestamp/1000);this.render(timestamp/1000);this.frame=requestAnimationFrame(this.loop);}
}

q('#new-game-button').addEventListener('click',()=>showAuth('new'));
q('#continue-button').addEventListener('click',()=>showAuth('continue'));
q('#login-tab').addEventListener('click',()=>setAuthMode('login'));
q('#register-tab').addEventListener('click',()=>setAuthMode('register'));
q('#auth-form').addEventListener('submit',authenticate);
q('#select-yang').addEventListener('click',selectYang);
q('#inventory-button').addEventListener('click',()=>game&&UI.renderInventory(game.save));
q('#respawn-button').addEventListener('click',()=>game?.respawn());
document.addEventListener('click',event=>{const action=event.target.closest('[data-action]')?.dataset.action;if(action==='back-title')UI.showScreen('title-screen');if(action==='logout')logout();});
document.addEventListener('gw2-modal-action',async event=>{
  if(!game)return;const {action,itemId}=event.detail;if(!action)return;
  if(action==='close-loot'){UI.closeModal();game.transition('platform');return;}
  if(action==='teleport'){UI.closeModal();game.transition(itemId);return;}
  try{
    let payload;if(action==='buy')payload=await api.action({type:'buy_item',itemId});else if(action==='equip')payload=await api.action({type:'equip_item',itemId});else if(action==='forge')payload=await api.action({type:'forge_sword'});else if(action==='exchange')payload=await api.action({type:'exchange_armor'});else return;
    game.save=payload.save;UI.toast(payload.result.message,'gold');
    if(action==='buy')UI.renderShop(game.save);else if(action==='equip')UI.renderInventory(game.save);else UI.renderForge(game.save);
  }catch(error){UI.toast(error.message,'red');}
});
window.addEventListener('beforeunload',()=>{if(game?.unsaved){const body=JSON.stringify({hero:game.save.hero,region:game.save.region,checkpoint:game.save.checkpoint,quest:game.save.quest,health:Math.max(1,Math.round(game.player.hp))});navigator.sendBeacon('/api/save',new Blob([body],{type:'application/json'}));}});

setAuthMode('login');checkServer();
