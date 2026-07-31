import { SECURITY_SURVIVAL_SECONDS } from './rules.js';

const BUILDINGS = [
  { number: '9', x: 620, y: 420, tone: '#376d6a' },
  { number: '8', x: 1800, y: 390, tone: '#bda356' },
  { number: '7', x: 2940, y: 440, tone: '#ad6247' },
  { number: '6', x: 650, y: 1140, tone: '#71806f' },
  { number: '5', x: 1800, y: 900, tone: '#376d6a' },
  { number: '4', x: 2940, y: 1160, tone: '#71806f' },
  { number: '3', x: 650, y: 1840, tone: '#376d6a' },
  { number: '2', x: 1800, y: 1990, tone: '#bda356', open: true },
  { number: '1', x: 2940, y: 1910, tone: '#ad6247' }
];

export const REGIONS = Object.freeze({
  platform: { id: 'platform', name: '中天帝都 · 台子', width: 3600, height: 2500, spawn: { x: 1800, y: 1420 }, checkpoint: 'platform_start' },
  security: { id: 'security', name: '西南禁区 · 保安处', width: 1320, height: 860, spawn: { x: 180, y: 430 }, checkpoint: 'security_entry' },
  building2_floor1: { id: 'building2_floor1', name: '2 号楼 · 失序大厅', width: 1800, height: 1100, spawn: { x: 150, y: 550 }, checkpoint: 'floor1_entry' },
  building2_floor2: { id: 'building2_floor2', name: '2 号楼 · 回声走廊', width: 1900, height: 980, spawn: { x: 150, y: 490 }, checkpoint: 'floor2_entry' },
  building2_boss: { id: 'building2_boss', name: '2 号楼 · 犬神办公室', width: 1500, height: 920, spawn: { x: 180, y: 460 }, checkpoint: 'boss_entry' },
  building1_floor1: { id: 'building1_floor1', name: '1 号楼 · 封闭接待大厅', width: 1680, height: 980, spawn: { x: 150, y: 490 }, checkpoint: 'building1_floor1_entry' },
  building1_floor2: { id: 'building1_floor2', name: '1 号楼 · 旧院长办公室', width: 1460, height: 900, spawn: { x: 150, y: 450 }, checkpoint: 'building1_floor2_entry' },
  building1_floor3: { id: 'building1_floor3', name: '1 号楼 · 档案射击廊', width: 1820, height: 940, spawn: { x: 145, y: 470 }, checkpoint: 'building1_floor3_entry' },
  building1_floor4: { id: 'building1_floor4', name: '1 号楼 · 失落祭坛室', width: 1560, height: 960, spawn: { x: 150, y: 480 }, checkpoint: 'building1_floor4_entry' },
  building1_floor5: { id: 'building1_floor5', name: '1 号楼 · 焚楼天台', width: 1520, height: 900, spawn: { x: 150, y: 450 }, checkpoint: 'building1_floor5_entry' },
  building1_attic: { id: 'building1_attic', name: '1 号楼 · 黑化院长阁楼', width: 1320, height: 860, spawn: { x: 150, y: 430 }, checkpoint: 'building1_attic_entry' }
});

function seed(value) { const x = Math.sin(value * 915.73) * 43758.5453; return x - Math.floor(x); }
const PLATFORM_DEBRIS = Array.from({ length: 230 }, (_, i) => ({ x: 80 + seed(i * 3 + 1) * 3440, y: 80 + seed(i * 3 + 2) * 2340, r: 1 + seed(i * 3 + 3) * 8 }));

export const isBuildingOneRegion = regionId => regionId.startsWith('building1_');

export function getInteractions(regionId, save = {}) {
  if (regionId === 'platform') return [
    { id: 'wang_ziyi', type: 'npc', x: 1800, y: 1160, radius: 92, label: '与王子毅交谈' },
    { id: 'shop', type: 'shop', x: 2070, y: 1320, radius: 90, label: '打开军需商店' },
    { id: 'forge', type: 'forge', x: 1530, y: 1320, radius: 90, label: '使用帝都锻造台' },
    { id: 'teleporter', type: 'teleporter', x: 1800, y: 1420, radius: 88, label: '查看台子传送阵' },
    { id: 'security_gate', type: 'portal', x: 390, y: 2210, radius: 110, label: '前往保安处', target: 'security' },
    { id: 'building2_gate', type: 'portal', x: 1800, y: 2105, radius: 115, label: '进入 2 号楼', target: 'building2_floor1' },
    ...(save.building1Unlocked ? [{ id: 'building1_gate', type: 'portal', x: 2940, y: 2045, radius: 115, label: '进入 1 号楼', target: 'building1_floor1' }] : [{ id: 'locked_1', type: 'locked', x: 2940, y: 2045, radius: 100, label: '1 号楼 · 尚未开放', number: '1' }]),
    ...BUILDINGS.filter(b => b.number !== '2' && b.number !== '1').map(b => ({ id: `locked_${b.number}`, type: 'locked', x: b.x, y: b.y + 135, radius: 100, label: `${b.number} 号楼 · 尚未开放`, number: b.number }))
  ];
  if (regionId === 'security') return [{ id: 'security_exit', type: 'portal', x: 90, y: 430, radius: 76, label: '返回中天台子', target: 'platform' }];
  if (regionId === 'building2_floor1') return [
    { id: 'floor1_exit', type: 'portal', x: 1690, y: 550, radius: 88, label: '进入回声走廊', target: 'building2_floor2', requiresClear: true },
    { id: 'floor1_return', type: 'portal', x: 80, y: 550, radius: 70, label: '退出副本', target: 'platform' }
  ];
  if (regionId === 'building2_floor2') return [
    { id: 'floor2_exit', type: 'portal', x: 1790, y: 490, radius: 88, label: '进入犬神办公室', target: 'building2_boss', requiresClear: true },
    { id: 'floor2_return', type: 'portal', x: 80, y: 490, radius: 70, label: '退出副本', target: 'platform' }
  ];
  if (regionId === 'building1_floor1') return [{ id: 'b1f1_exit', type: 'portal', x: 1590, y: 490, radius: 82, label: '进入 2 楼', target: 'building1_floor2', requiresClear: true }, { id: 'b1_return', type: 'portal', x: 80, y: 490, radius: 70, label: '退出副本', target: 'platform' }];
  if (regionId === 'building1_floor2') return [{ id: 'b1f2_exit', type: 'portal', x: 1370, y: 450, radius: 82, label: '进入 3 楼', target: 'building1_floor3', requiresClear: true }, { id: 'b1_return', type: 'portal', x: 80, y: 450, radius: 70, label: '退出副本', target: 'platform' }];
  if (regionId === 'building1_floor3') return [{ id: 'b1f3_exit', type: 'portal', x: 1730, y: 470, radius: 82, label: '进入 4 楼', target: 'building1_floor4', requiresClear: true }, { id: 'b1_return', type: 'portal', x: 80, y: 470, radius: 70, label: '退出副本', target: 'platform' }];
  if (regionId === 'building1_floor4') return [
    { id: 'b1f4_exit', type: 'portal', x: 1470, y: 480, radius: 82, label: '进入 5 楼', target: 'building1_floor5', requiresClear: true },
    ...(save.atticKeys > 0 && !save.atticUnlocked ? [{ id: 'attic_altar', type: 'altar', x: 780, y: 480, radius: 96, label: '使用阁楼钥匙解除封印' }] : []),
    { id: 'b1_return', type: 'portal', x: 80, y: 480, radius: 70, label: '退出副本', target: 'platform' }
  ];
  if (regionId === 'building1_floor5') return [
    { id: 'b1_return', type: 'portal', x: 80, y: 450, radius: 70, label: '退出副本', target: 'platform' },
    ...(save.atticUnlocked ? [{ id: 'attic_vortex', type: 'portal', x: 1320, y: 450, radius: 92, label: '踏入黑化阁楼', target: 'building1_attic', requiresClear: true }] : [])
  ];
  if (regionId === 'building1_attic') return [{ id: 'attic_return', type: 'portal', x: 75, y: 430, radius: 70, label: '退出阁楼', target: 'platform' }];
  return [{ id: 'boss_return', type: 'portal', x: 80, y: 460, radius: 70, label: '退出副本', target: 'platform' }];
}

export function createRegionEnemies(regionId) {
  const make = (type, x, y, index) => {
    const configs = {
      hall_patrol: { name: '安保残影', hp: 105, speed: 92, damage: 14, r: 21, goldType: 'hall_patrol' },
      security_echo: { name: '失序巡逻', hp: 125, speed: 82, damage: 16, r: 22, goldType: 'security_echo' },
      corridor_archer: { name: '回声射手', hp: 90, speed: 67, damage: 13, r: 19, goldType: 'corridor_archer', ranged: true },
      zigou: { name: '子狗', hp: 1380, speed: 88, damage: 24, r: 47, boss: true, bossId: 'zigou' },
      building1_guard: { name: '黑化门卫', hp: 135, speed: 105, damage: 17, r: 22, goldType: 'building1_guard' },
      building1_archer: { name: '档案射手', hp: 105, speed: 78, damage: 16, r: 20, goldType: 'building1_archer', ranged: true },
      building1_wraith: { name: '残页怨灵', hp: 155, speed: 108, damage: 20, r: 23, goldType: 'building1_wraith' },
      pang: { name: '小胖', hp: 3300, speed: 56, damage: 12, r: 54, boss: true, bossId: 'pang' },
      youkai: { name: '魔王尤恺', hp: 1850, speed: 202, damage: 25, r: 45, boss: true, bossId: 'youkai' },
      dean: { name: '黑化院长', hp: 2850, speed: 265, damage: 0, r: 18, boss: true, bossId: 'dean', mirror: true }
    }[type];
    return { id: `${type}_${index}`, type, x, y, maxHp: configs.hp, hp: configs.hp, vx: 0, vy: 0, attackCd: .5 + seed(index) * .7, hitFlash: 0, airborne: 0, dead: false, phaseTimer: 2, dashTimer: 0, facing: Math.PI, aura: 0, dragonBlood: 0, step: 0, attackChain: 0, attackChainTimer: 0, dashMotion: null, animation: { action: null, elapsed: 0, duration: 0, locked: false }, ...configs };
  };
  if (regionId === 'building2_floor1') return [
    make('hall_patrol', 510, 300, 1), make('hall_patrol', 760, 720, 2), make('hall_patrol', 990, 330, 3),
    make('hall_patrol', 1220, 710, 4), make('hall_patrol', 1400, 420, 5), make('security_echo', 920, 540, 6)
  ];
  if (regionId === 'building2_floor2') return [
    make('corridor_archer', 560, 220, 1), make('hall_patrol', 720, 490, 2), make('corridor_archer', 900, 760, 3),
    make('security_echo', 1110, 360, 4), make('corridor_archer', 1370, 220, 5), make('security_echo', 1510, 660, 6)
  ];
  if (regionId === 'building2_boss') return [make('zigou', 1120, 460, 1)];
  if (regionId === 'building1_floor1') return [make('building1_guard', 430, 250, 1), make('building1_archer', 620, 710, 2), make('building1_guard', 830, 340, 3), make('building1_archer', 1040, 680, 4), make('building1_guard', 1250, 260, 5), make('building1_archer', 1430, 670, 6)];
  if (regionId === 'building1_floor2') return [make('pang', 1080, 450, 1)];
  if (regionId === 'building1_floor3') return [make('building1_archer', 410, 220, 1), make('building1_archer', 590, 720, 2), make('building1_guard', 740, 420, 3), make('building1_archer', 900, 180, 4), make('building1_archer', 1080, 760, 5), make('building1_wraith', 1240, 390, 6), make('building1_archer', 1450, 230, 7), make('building1_archer', 1610, 700, 8)];
  if (regionId === 'building1_floor4') return [make('building1_wraith', 430, 270, 1), make('building1_archer', 590, 700, 2), make('building1_guard', 970, 280, 3), make('building1_archer', 1200, 690, 4)];
  if (regionId === 'building1_floor5') return [make('youkai', 1080, 450, 1)];
  if (regionId === 'building1_attic') return [make('dean', 960, 430, 1)];
  return [];
}

export function getRegionWalls(regionId) {
  const walls = {
    building1_floor1: [{ x: 355, y: 80, w: 60, h: 570 }, { x: 690, y: 350, w: 60, h: 550 }, { x: 1030, y: 80, w: 60, h: 570 }, { x: 1370, y: 350, w: 60, h: 550 }],
    building1_floor2: [{ x: 585, y: 120, w: 80, h: 240 }, { x: 585, y: 540, w: 80, h: 240 }, { x: 1110, y: 120, w: 80, h: 240 }, { x: 1110, y: 540, w: 80, h: 240 }],
    building1_floor3: [{ x: 360, y: 110, w: 55, h: 560 }, { x: 670, y: 270, w: 55, h: 580 }, { x: 980, y: 100, w: 55, h: 560 }, { x: 1290, y: 280, w: 55, h: 570 }, { x: 1570, y: 120, w: 55, h: 540 }],
    building1_floor4: [{ x: 520, y: 260, w: 90, h: 130 }, { x: 950, y: 260, w: 90, h: 130 }, { x: 520, y: 570, w: 90, h: 130 }, { x: 950, y: 570, w: 90, h: 130 }],
    building1_floor5: [{ x: 430, y: 160, w: 90, h: 190 }, { x: 430, y: 550, w: 90, h: 190 }, { x: 1120, y: 160, w: 90, h: 190 }, { x: 1120, y: 550, w: 90, h: 190 }],
    building1_attic: [{ x: 370, y: 120, w: 75, h: 270 }, { x: 370, y: 500, w: 75, h: 240 }, { x: 800, y: 120, w: 75, h: 270 }, { x: 800, y: 500, w: 75, h: 240 }]
  };
  return walls[regionId] || [];
}

export function createRegionHazards(regionId) {
  const spike = (x, y, r = 45) => ({ type: 'spike', x, y, r, period: 2.8, activeFor: 1, offset: (x + y) % 1.3, damage: 24, static: true, hitCd: 0 });
  const fire = (x, y, r = 68) => ({ type: 'fire', x, y, r, period: 3.6, activeFor: 1.45, offset: (x + y) % 1.7, damage: 31, static: true, hitCd: 0 });
  if (regionId === 'building1_floor1') return [spike(535, 490), spike(1180, 490)];
  if (regionId === 'building1_floor3') return [fire(520, 480), fire(1150, 480), fire(1530, 480)];
  if (regionId === 'building1_floor4') return [spike(780, 220), spike(780, 740)];
  if (regionId === 'building1_floor5') return [fire(760, 220), fire(760, 680)];
  if (regionId === 'building1_attic') return [spike(650, 220), spike(650, 640), fire(1050, 430)];
  return [];
}

function drawLamp(ctx, x, y, time, red = false) {
  const pulse = .7 + Math.sin(time * 3 + x) * .12;
  ctx.fillStyle = '#1c282a'; ctx.fillRect(x - 3, y, 6, 42);
  const color = red ? [226, 76, 62] : [103, 224, 196];
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 48);
  glow.addColorStop(0, `rgba(${color.join(',')},${pulse})`); glow.addColorStop(1, `rgba(${color.join(',')},0)`);
  ctx.fillStyle = glow; ctx.fillRect(x - 48, y - 48, 96, 96);
  ctx.fillStyle = red ? '#f27968' : '#9af2dc'; ctx.fillRect(x - 3, y - 3, 6, 7);
}

function drawBuilding(ctx, building, time) {
  const w = 300, h = 245, x = building.x - w / 2, y = building.y - h / 2;
  ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.fillRect(x + 18, y + 22, w, h);
  const facade = ctx.createLinearGradient(x, y, x + w, y + h); facade.addColorStop(0, '#17262b'); facade.addColorStop(1, '#0b1519');
  ctx.fillStyle = facade; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = building.open ? 'rgba(227,190,101,.7)' : `${building.tone}aa`; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = building.tone; ctx.globalAlpha = .24; ctx.fillRect(x + 12, y + 12, w - 24, 40); ctx.globalAlpha = 1;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
    const active = seed(Number(building.number) * 70 + row * 8 + col) > .38;
    ctx.fillStyle = active ? (building.open ? 'rgba(255,216,122,.62)' : 'rgba(104,205,187,.34)') : '#071014';
    ctx.fillRect(x + 25 + col * 43, y + 71 + row * 42, 24, 19);
  }
  ctx.fillStyle = building.open ? '#be8e3d' : '#233238'; ctx.fillRect(building.x - 29, y + h - 55, 58, 55);
  ctx.textAlign = 'center'; ctx.fillStyle = '#e8d49e'; ctx.font = '700 49px serif'; ctx.fillText(building.number, building.x, y + 57);
  ctx.font = '10px sans-serif'; ctx.fillStyle = building.open ? '#eacb7c' : '#73827f'; ctx.fillText(building.open ? '副本已开放' : '封印中', building.x, y + h + 22);
  if (building.open) drawLamp(ctx, x + 25, y + h - 12, time); else drawLamp(ctx, x + 25, y + h - 12, time, true);
}

function drawPlatformFallback(ctx, time, save = {}) {
  const bg = ctx.createLinearGradient(0, 0, 3600, 2500); bg.addColorStop(0, '#0c2528'); bg.addColorStop(.55, '#102326'); bg.addColorStop(1, '#171c22');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 3600, 2500);
  ctx.strokeStyle = 'rgba(109,218,196,.06)'; ctx.lineWidth = 1;
  for (let x = 0; x < 3600; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 2500); ctx.stroke(); }
  for (let y = 0; y < 2500; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(3600, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(201,161,80,.17)'; ctx.lineWidth = 62; ctx.lineCap = 'round';
  for (const point of [[620,420],[1800,390],[2940,440],[650,1140],[1800,900],[2940,1160],[650,1840],[1800,1990],[2940,1910],[390,2210]]) {
    ctx.beginPath(); ctx.moveTo(1800,1320); ctx.lineTo(point[0],point[1]); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(24,40,39,.82)'; ctx.lineWidth = 40;
  for (const point of [[620,420],[1800,390],[2940,440],[650,1140],[1800,900],[2940,1160],[650,1840],[1800,1990],[2940,1910],[390,2210]]) {
    ctx.beginPath(); ctx.moveTo(1800,1320); ctx.lineTo(point[0],point[1]); ctx.stroke();
  }
  for (const debris of PLATFORM_DEBRIS) { ctx.fillStyle = debris.r > 5 ? 'rgba(44,73,67,.55)' : 'rgba(112,144,132,.2)'; ctx.beginPath(); ctx.arc(debris.x,debris.y,debris.r,0,Math.PI*2); ctx.fill(); }
  for (const building of BUILDINGS) drawBuilding(ctx, building.number === '1' && save.building1Unlocked ? { ...building, open: true } : building, time);
  ctx.fillStyle = '#121e22'; ctx.fillRect(230, 2080, 320, 235); ctx.strokeStyle = '#b45b48'; ctx.lineWidth = 4; ctx.strokeRect(230,2080,320,235);
  ctx.fillStyle = '#8d493e'; ctx.fillRect(268,2118,244,46); ctx.fillStyle = '#f0c878'; ctx.font = '700 24px serif'; ctx.textAlign = 'center'; ctx.fillText('保 安 处',390,2151);
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#b37d66'; ctx.fillText('反弹弹幕训练禁区',390,2335);
  const g = ctx.createRadialGradient(1800,1320,20,1800,1320,230); g.addColorStop(0,'rgba(225,184,88,.23)'); g.addColorStop(1,'rgba(225,184,88,0)'); ctx.fillStyle=g;ctx.fillRect(1570,1090,460,460);
  ctx.fillStyle='#17252a';ctx.beginPath();ctx.moveTo(1600,1250);ctx.lineTo(1800,1130);ctx.lineTo(2000,1250);ctx.lineTo(2000,1450);ctx.lineTo(1600,1450);ctx.closePath();ctx.fill();ctx.strokeStyle='#c49542';ctx.lineWidth=5;ctx.stroke();
  ctx.strokeStyle='rgba(240,202,112,.5)';ctx.lineWidth=2;for(let r=45;r<=130;r+=42){ctx.beginPath();ctx.arc(1800,1360,r,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle='#ebd18a';ctx.font='700 20px serif';ctx.fillText('中 天 台 子',1800,1110);
  drawStall(ctx,2070,1320,'军需商店','#63c8b4'); drawStall(ctx,1530,1320,'帝都锻造','#d49c50');
  drawNpc(ctx,1800,1160);
}

function drawStall(ctx,x,y,label,color){ctx.fillStyle='#0d171b';ctx.fillRect(x-70,y-45,140,90);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(x-70,y-45,140,90);ctx.fillStyle=color;ctx.fillRect(x-58,y-31,116,6);ctx.fillStyle='#d9d3c1';ctx.font='12px serif';ctx.textAlign='center';ctx.fillText(label,x,y+15);}
function drawNpc(ctx,x,y){ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,y+22,28,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#813f3d';ctx.beginPath();ctx.moveTo(x-22,y+20);ctx.lineTo(x-14,y-30);ctx.lineTo(x+14,y-30);ctx.lineTo(x+23,y+20);ctx.closePath();ctx.fill();ctx.strokeStyle='#d9a750';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#c9936e';ctx.beginPath();ctx.arc(x,y-43,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#20262a';ctx.beginPath();ctx.arc(x-1,y-49,15,Math.PI,0);ctx.fill();ctx.fillStyle='#f1c86d';ctx.font='700 13px serif';ctx.textAlign='center';ctx.fillText('王子毅',x,y+44);}

function drawSecurityFallback(ctx,time){const g=ctx.createLinearGradient(0,0,1320,860);g.addColorStop(0,'#1b1b20');g.addColorStop(1,'#241518');ctx.fillStyle=g;ctx.fillRect(0,0,1320,860);ctx.fillStyle='#301f22';ctx.fillRect(65,65,1190,730);ctx.strokeStyle='#b55a4c';ctx.lineWidth=8;ctx.strokeRect(65,65,1190,730);ctx.strokeStyle='rgba(222,103,83,.13)';ctx.lineWidth=1;for(let x=110;x<1250;x+=70){ctx.beginPath();ctx.moveTo(x,65);ctx.lineTo(x,795);ctx.stroke();}for(let y=110;y<795;y+=70){ctx.beginPath();ctx.moveTo(65,y);ctx.lineTo(1255,y);ctx.stroke();}ctx.fillStyle='rgba(226,78,65,.08)';ctx.font='700 140px sans-serif';ctx.textAlign='center';ctx.fillText('禁 区',660,475);drawSecuritySignals(ctx,time);ctx.fillStyle='#dd7564';ctx.font='700 13px sans-serif';ctx.fillText(`连续 ${SECURITY_SURVIVAL_SECONDS} 秒无伤 · 子弹触墙反弹`,660,105);}

function drawDungeonFallback(ctx,regionId,time){const region=REGIONS[regionId];const buildingOne=isBuildingOneRegion(regionId);const boss=regionId==='building2_boss'||regionId==='building1_floor2'||regionId==='building1_floor5'||regionId==='building1_attic';const floor2=regionId==='building2_floor2';const g=ctx.createLinearGradient(0,0,region.width,region.height);g.addColorStop(0,buildingOne?'#28191d':boss?'#25131a':'#101a20');g.addColorStop(1,buildingOne?'#100b10':boss?'#11080d':'#172529');ctx.fillStyle=g;ctx.fillRect(0,0,region.width,region.height);ctx.fillStyle=buildingOne?'#25161b':boss?'#3a1c25':'#1a2a2d';ctx.fillRect(55,55,region.width-110,region.height-110);ctx.strokeStyle=buildingOne?'#a25b51':boss?'#a4474d':'#4b8f84';ctx.lineWidth=7;ctx.strokeRect(55,55,region.width-110,region.height-110);ctx.strokeStyle=buildingOne?'rgba(218,104,86,.13)':boss?'rgba(193,69,76,.12)':'rgba(93,189,169,.1)';ctx.lineWidth=1;for(let x=100;x<region.width-80;x+=80){ctx.beginPath();ctx.moveTo(x,55);ctx.lineTo(x,region.height-55);ctx.stroke();}for(let y=100;y<region.height-80;y+=80){ctx.beginPath();ctx.moveTo(55,y);ctx.lineTo(region.width-55,y);ctx.stroke();}if(floor2){for(let x=400;x<1600;x+=400){ctx.fillStyle='#0a1317';ctx.fillRect(x,170,55,640);ctx.strokeStyle='rgba(98,211,188,.22)';ctx.strokeRect(x,170,55,640);}}if(regionId==='building1_floor4'){ctx.save();ctx.translate(780,480);ctx.strokeStyle='rgba(240,194,91,.52)';ctx.lineWidth=3;for(const r of [45,80,116]){ctx.beginPath();ctx.arc(0,0,r+Math.sin(time*2+r)*3,0,Math.PI*2);ctx.stroke();}ctx.restore();}if(boss){const cx=region.width*.7,cy=region.height*.5;const aura=ctx.createRadialGradient(cx,cy,20,cx,cy,330);aura.addColorStop(0,buildingOne?'rgba(216,73,73,.2)':'rgba(190,56,63,.18)');aura.addColorStop(1,'rgba(190,56,63,0)');ctx.fillStyle=aura;ctx.fillRect(cx-360,cy-360,720,720);ctx.fillStyle='rgba(222,81,72,.1)';ctx.font='700 190px serif';ctx.textAlign='center';ctx.fillText(regionId==='building1_attic'?'院':regionId==='building1_floor5'?'焰':regionId==='building1_floor2'?'胖':'犬',cx,cy+70);}ctx.fillStyle=buildingOne?'#e3927d':boss?'#d66a63':'#77cdb9';ctx.font='700 13px serif';ctx.textAlign='center';ctx.fillText(region.name,region.width/2,95);}

function drawCursedGate(ctx,x,y,label,active,time){const pulse=.62+Math.sin(time*4+x)*.16;ctx.save();ctx.fillStyle=active?`rgba(211,151,74,${.16+pulse*.12})`:'rgba(157,56,51,.13)';ctx.beginPath();ctx.arc(x,y,72+pulse*8,0,Math.PI*2);ctx.fill();ctx.strokeStyle=active?`rgba(238,194,105,${.5+pulse*.22})`:'rgba(204,77,65,.5)';ctx.lineWidth=3;ctx.strokeRect(x-36,y-30,72,60);ctx.fillStyle=active?'#ead29a':'#d78273';ctx.font='700 13px serif';ctx.textAlign='center';ctx.fillText(label,x,y+53);ctx.restore();}
function drawPropertyPoint(ctx,x,y,label,color,time){const pulse=.72+Math.sin(time*3+y)*.16;ctx.save();ctx.fillStyle=`rgba(0,0,0,${.34+pulse*.08})`;ctx.beginPath();ctx.ellipse(x,y+17,24,8,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=color;ctx.globalAlpha=pulse;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,23+pulse*4,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=color;ctx.font='700 12px serif';ctx.textAlign='center';ctx.fillText(label,x,y-34);ctx.restore();}
function drawSealingDais(ctx,time){ctx.save();ctx.translate(1800,1360);ctx.strokeStyle='rgba(239,201,111,.48)';ctx.lineWidth=2;for(const radius of [42,78,116]){ctx.beginPath();ctx.arc(0,0,radius+Math.sin(time*2+radius)*2,0,Math.PI*2);ctx.stroke();}ctx.restore();}
function drawSecuritySignals(ctx,time){for(const [x,y] of [[95,95],[1225,95],[95,765],[1225,765]])drawLamp(ctx,x,y,time,true);ctx.save();ctx.strokeStyle='rgba(224,88,72,.35)';ctx.setLineDash([14,12]);ctx.lineWidth=2;ctx.strokeRect(65,65,1190,730);ctx.restore();}
function drawDungeonExit(ctx,regionId,time){const exit=regionId==='building2_floor1'?{x:1690,y:550}:regionId==='building2_floor2'?{x:1790,y:490}:null;if(!exit)return;const pulse=.7+Math.sin(time*4)*.18;ctx.save();ctx.fillStyle=`rgba(108,219,194,${.08+pulse*.1})`;ctx.beginPath();ctx.arc(exit.x,exit.y,57+pulse*7,0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgba(121,231,204,${.42+pulse*.24})`;ctx.lineWidth=3;ctx.strokeRect(exit.x-24,exit.y-42,48,84);ctx.restore();}

function drawPlatformRegion(ctx,time){if(!drawWorldArt(ctx,'platform',3600,2500)){drawPlatformFallback(ctx,time);return;}drawSealingDais(ctx,time);drawPropertyPoint(ctx,1800,1160,'王子毅','#e8c16d',time);drawPropertyPoint(ctx,2070,1320,'军需','#63c8b4',time);drawPropertyPoint(ctx,1530,1320,'锻造','#d49c50',time);drawCursedGate(ctx,390,2210,'保安处',true,time);drawCursedGate(ctx,1800,2105,'2 号楼',true,time);}
function drawSecurity(ctx,time){if(!drawWorldArt(ctx,'security',1320,860)){drawSecurityFallback(ctx,time);return;}drawSecuritySignals(ctx,time);ctx.fillStyle='#dd7564';ctx.font='700 13px sans-serif';ctx.textAlign='center';ctx.fillText(`连续 ${SECURITY_SURVIVAL_SECONDS} 秒无伤 · 子弹触墙反弹`,660,105);}
function drawDungeon(ctx,regionId,time){const region=REGIONS[regionId];if(!drawWorldArt(ctx,regionId,region.width,region.height)){drawDungeonFallback(ctx,regionId,time);return;}if(regionId==='building2_boss'){const aura=ctx.createRadialGradient(1120,460,20,1120,460,330);aura.addColorStop(0,'rgba(190,56,63,.2)');aura.addColorStop(1,'rgba(190,56,63,0)');ctx.fillStyle=aura;ctx.fillRect(760,100,720,720);}else drawDungeonExit(ctx,regionId,time);ctx.fillStyle=regionId==='building2_boss'?'#d66a63':'#77cdb9';ctx.font='700 13px serif';ctx.textAlign='center';ctx.fillText(region.name,region.width/2,95);}

export function drawRegion(ctx, regionId, time, save = {}) {
  if (regionId === 'platform') drawPlatformFallback(ctx,time,save);
  else if (regionId === 'security') drawSecurityFallback(ctx,time);
  else drawDungeonFallback(ctx,regionId,time);
}
