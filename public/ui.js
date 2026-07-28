import { ITEMS, armorReduction, weaponAttack } from './rules.js';

const q = (selector) => document.querySelector(selector);
const qa = (selector) => [...document.querySelectorAll(selector)];
const elements = {
  screens: qa('.screen'), toast: q('#game-toast'), prompt: q('#interaction-prompt'), dialogue: q('#dialogue'),
  dialogueText: q('#dialogue-text'), dialogueSpeaker: q('#dialogue-speaker'), dialogueRole: q('#dialogue-role'),
  modal: q('#modal'), modalKicker: q('#modal-kicker'), modalTitle: q('#modal-title'), modalContent: q('#modal-content'),
  hpFill: q('#hp-fill'), hpText: q('#hp-text'), weapon: q('#weapon-label'), zone: q('#zone-name'), saveState: q('#save-state'),
  gold: q('#gold-value'), pearls: q('#pearl-value'), questTitle: q('#quest-title'), questCopy: q('#quest-copy'),
  challenge: q('#challenge-timer'), challengeValue: q('#challenge-timer strong'), boss: q('#boss-hud'), bossFill: q('#boss-fill'), bossPhase: q('#boss-phase'),
  musouFill: q('#musou-fill'), musouText: q('#musou-text'), dragonBlood: q('#dragon-blood'), transition: q('#region-transition'),
  defeat: q('#defeat-overlay')
};

let toastTimer = 0;
let dialogueState = null;
let modalHandler = null;

export const UI = {
  showScreen(id) {
    for (const screen of elements.screens) screen.classList.toggle('active', screen.id === id);
  },
  toast(message, tone = 'gold', seconds = 2.4) {
    elements.toast.textContent = message; elements.toast.dataset.tone = tone; elements.toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => elements.toast.classList.remove('show'), seconds * 1000);
  },
  setPrompt(text) {
    elements.prompt.querySelector('span').textContent = text || '';
    elements.prompt.classList.toggle('hidden', !text);
  },
  showDialogue({ speaker = '王子毅', role = '中天守备官', pages, onComplete }) {
    dialogueState = { pages, index: 0, onComplete };
    elements.dialogueSpeaker.textContent = speaker; elements.dialogueRole.textContent = role;
    elements.dialogueText.textContent = pages[0]; elements.dialogue.classList.add('open');
  },
  advanceDialogue() {
    if (!dialogueState) return false;
    if (dialogueState.index < dialogueState.pages.length - 1) {
      dialogueState.index += 1; elements.dialogueText.textContent = dialogueState.pages[dialogueState.index]; return true;
    }
    const complete = dialogueState.onComplete; dialogueState = null; elements.dialogue.classList.remove('open');
    if (complete) complete(); return true;
  },
  dialogueOpen() { return Boolean(dialogueState); },
  transition(name, active) { elements.transition.querySelector('span').textContent = name ? `正在前往 · ${name}` : '正在穿越帝都'; elements.transition.classList.toggle('active', active); },
  saveStatus(status) {
    const labels = { saving: '正在存档', saved: '档案已同步', offline: '存档待同步', error: '存档失败' };
    elements.saveState.textContent = labels[status] || status; elements.saveState.dataset.state = status;
  },
  renderHud(game) {
    const { save, player, region, challenge, boss } = game;
    elements.hpFill.style.width = `${Math.max(0, player.hp / player.maxHp * 100)}%`;
    elements.hpText.textContent = `生命 ${Math.ceil(player.hp)} / ${player.maxHp}`;
    const weapon = ITEMS[save.equipped?.weapon];
    elements.weapon.textContent = weapon ? `${weapon.name} · 攻击 ${weaponAttack(save)}` : '赤手';
    elements.zone.textContent = region.name; elements.gold.textContent = save.gold; elements.pearls.textContent = save.pearls;
    elements.musouFill.style.width = `${player.musou}%`; elements.musouText.textContent = `${Math.floor(player.musou)} / 100`;
    elements.dragonBlood.classList.toggle('hidden', player.dragonBlood <= 0);
    [...elements.dragonBlood.querySelectorAll('span')].forEach((dot, index) => dot.classList.toggle('active', index < player.dragonBlood));
    elements.challenge.classList.toggle('hidden', !challenge?.active);
    if (challenge?.active) {
      const seconds = Math.max(0, challenge.time); elements.challengeValue.textContent = `00:${seconds.toFixed(1).padStart(4, '0')}`;
    }
    elements.boss.classList.toggle('hidden', !boss);
    if (boss) { elements.bossFill.style.width = `${Math.max(0, boss.hp / boss.maxHp * 100)}%`; elements.bossPhase.textContent = boss.hp <= boss.maxHp / 2 ? '狂躁阶段' : '第一阶段'; }
  },
  setQuest(title, copy) { elements.questTitle.textContent = title; elements.questCopy.textContent = copy; },
  showDefeat(show) { elements.defeat.classList.toggle('open', show); },
  openModal(kicker, title, html, handler) {
    elements.modalKicker.textContent = kicker; elements.modalTitle.textContent = title; elements.modalContent.innerHTML = html;
    modalHandler = handler || null; elements.modal.classList.add('open');
  },
  closeModal() { elements.modal.classList.remove('open'); modalHandler = null; },
  modalOpen() { return elements.modal.classList.contains('open'); },
  renderInventory(save) {
    const owned = save.inventory.map(id => ITEMS[id]).filter(Boolean);
    const cards = owned.length ? owned.map(item => {
      const equipped = save.equipped[item.slot] === item.id;
      const stat = item.slot === 'weapon' ? `攻击 ${item.id === 'imperial_sword' ? weaponAttack(save) : item.attack}` : `减伤 ${Math.round(item.reduction * 100)}%`;
      return `<article class="item-row ${item.rarity}"><div><small>${item.slot === 'weapon' ? '武器' : '护甲'} · ${stat}</small><h3>${item.name}</h3><p>${item.copy}</p></div><button data-action="equip" data-item="${item.id}" ${equipped ? 'disabled' : ''}>${equipped ? '已装备' : '装备'}</button></article>`;
    }).join('') : '<p class="empty-copy">背包还是空的。帝都不会同情赤手的人。</p>';
    this.openModal('IMPERIAL INVENTORY', '装备与属性', `<div class="stat-strip"><span>武器攻击<strong>${weaponAttack(save)}</strong></span><span>护甲减伤<strong>${Math.round(armorReduction(save) * 100)}%</strong></span><span>帝王剑阶<strong>${save.swordRank} / 9</strong></span></div><div class="item-list">${cards}</div>`, null);
  },
  renderShop(save) {
    const products = Object.values(ITEMS).filter(item => item.price !== null);
    const html = products.map(item => {
      const owned = save.inventory.includes(item.id); const stat = item.slot === 'weapon' ? `攻击 ${item.attack}` : `减伤 ${Math.round(item.reduction * 100)}%`;
      return `<article class="shop-item ${item.rarity}"><div class="item-rune">${item.slot === 'weapon' ? '剑' : '甲'}</div><div><small>${stat}</small><h3>${item.name}</h3><p>${item.copy}</p></div><div class="price"><strong>${item.price}</strong><span>金币</span><button data-action="buy" data-item="${item.id}" ${owned || save.gold < item.price ? 'disabled' : ''}>${owned ? '已拥有' : '购买'}</button></div></article>`;
    }).join('');
    this.openModal('ZHONGTIAN ARMORY', '台子 · 军需商店', `<div class="balance-line">当前金币 <strong>${save.gold}</strong></div><div class="shop-grid">${html}</div>`, null);
  },
  renderForge(save) {
    const attack = 35 + save.swordRank * 5; const max = save.swordRank >= 9;
    this.openModal('IMPERIAL FORGE', '台子 · 锻造与兑换', `<div class="forge-hero"><div class="forge-sword">帝</div><div><small>当前灵珠 ${save.pearls}</small><h3>帝王剑 · ${save.swordRank} 阶</h3><p>当前攻击 ${attack}${max ? ' · 已达最高阶' : ` · 下一阶 ${attack + 5}`}</p></div></div><div class="forge-actions"><article><small>帝王剑升阶</small><h3>三珠淬帝锋</h3><p>消耗 3 颗子狗灵珠，最高升至 9 阶。</p><button data-action="forge" ${max || save.pearls < 3 || !save.inventory.includes('imperial_sword') ? 'disabled' : ''}>消耗 3 灵珠</button></article><article><small>传说护甲保底</small><h3>五珠唤天犬</h3><p>消耗 5 颗子狗灵珠，兑换减伤 42% 的天犬甲。</p><button data-action="exchange" ${save.pearls < 5 || save.inventory.includes('heavenly_hound_armor') ? 'disabled' : ''}>消耗 5 灵珠</button></article></div>`, null);
  },
  showBossLoot(result) {
    const loot = [`金币 +${result.gold}`]; if (result.pearls) loot.push('子狗灵珠 +1'); if (result.armor) loot.push('天犬甲直接掉落');
    this.openModal('BOSS DEFEATED', '子狗 · 伏诛', `<div class="boss-loot"><div class="loot-seal">犬</div><p>犬神办公室重新归于寂静。</p><div>${loot.map(text => `<span>${text}</span>`).join('')}</div><button data-action="close-loot">返回中天台子</button></div>`, null);
  }
};

q('#modal-close').addEventListener('click', () => UI.closeModal());
elements.modalContent.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (button && modalHandler) modalHandler(button.dataset.action, button.dataset.item);
  document.dispatchEvent(new CustomEvent('gw2-modal-action', { detail: { action: button?.dataset.action, itemId: button?.dataset.item } }));
});
