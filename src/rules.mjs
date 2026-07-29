export const ITEM_CATALOG = Object.freeze({
  imperial_sword: { id: 'imperial_sword', name: '帝王剑', slot: 'weapon', attack: 35, price: null, rarity: 'quest' },
  guard_broadsword: { id: 'guard_broadsword', name: '城卫阔剑', slot: 'weapon', attack: 42, price: 180, rarity: 'common' },
  iron_sword: { id: 'iron_sword', name: '玄铁长剑', slot: 'weapon', attack: 55, price: 330, rarity: 'common' },
  breaker_blade: { id: 'breaker_blade', name: '破军重锋', slot: 'weapon', attack: 72, price: 620, rarity: 'common' },
  guard_armor: { id: 'guard_armor', name: '城卫软甲', slot: 'armor', reduction: 0.08, price: 160, rarity: 'common' },
  iron_armor: { id: 'iron_armor', name: '玄铁胸甲', slot: 'armor', reduction: 0.16, price: 330, rarity: 'common' },
  breaker_armor: { id: 'breaker_armor', name: '破军铠', slot: 'armor', reduction: 0.25, price: 620, rarity: 'common' },
  heavenly_hound_armor: { id: 'heavenly_hound_armor', name: '天犬甲', slot: 'armor', reduction: 0.42, price: null, rarity: 'legendary' }
});

export const IMPERIAL_SWORD_MAX_RANK = 3;
export const IMPERIAL_SWORD_ATTACK_BY_RANK = Object.freeze([35, 45, 55, 60]);
const SWORD_FORGE_COSTS = Object.freeze([
  { gold: 1000, pearls: 0 },
  { gold: 2000, pearls: 0 },
  { gold: 0, pearls: 5 }
]);

const REGIONS = new Set(['platform', 'security', 'building2_floor1', 'building2_floor2', 'building2_boss']);
const QUESTS = ['intro', 'security_active', 'security_complete', 'sword_awarded', 'building2_active'];
const CHECKPOINTS = new Set(['platform_start', 'security_entry', 'floor1_entry', 'floor2_entry', 'boss_entry']);

export class RuleError extends Error {
  constructor(message, code = 'RULE_ERROR') {
    super(message);
    this.name = 'RuleError';
    this.code = code;
  }
}

export function createInitialSave() {
  return {
    version: 1,
    hero: null,
    region: 'platform',
    checkpoint: 'platform_start',
    quest: 'intro',
    health: 160,
    maxHealth: 160,
    gold: 0,
    pearls: 0,
    swordRank: 0,
    inventory: [],
    equipped: { weapon: null, armor: null },
    bossClears: 0,
    unlockedRegions: ['platform', 'security'],
    updatedAt: new Date(0).toISOString()
  };
}

export function calculateDamage(baseDamage, reduction = 0, imperialAura = false) {
  const base = Math.max(0, Number(baseDamage) || 0);
  const armorReduction = Math.min(0.95, Math.max(0, Number(reduction) || 0));
  const afterArmor = Math.ceil(base - armorReduction * base);
  const afterAura = imperialAura ? Math.ceil(afterArmor * 0.5) : afterArmor;
  return Math.max(1, afterAura);
}

export function rollBossLoot(randomValueArmor, randomValuePearl) {
  return { armor: randomValueArmor < 0.05, pearls: randomValuePearl < 0.25 ? 1 : 0 };
}

export function getWeaponAttack(save) {
  if (save.equipped?.weapon !== 'imperial_sword') return 0;
  const rank = Math.min(IMPERIAL_SWORD_MAX_RANK, Math.max(0, Math.floor(Number(save.swordRank) || 0)));
  return IMPERIAL_SWORD_ATTACK_BY_RANK[rank];
}

export function getArmorReduction(save) {
  return ITEM_CATALOG[save.equipped?.armor]?.reduction || 0;
}

function cloneSave(save) {
  return {
    ...createInitialSave(),
    ...structuredClone(save),
    inventory: Array.isArray(save.inventory) ? [...new Set(save.inventory.filter(id => ITEM_CATALOG[id]))] : [],
    equipped: { weapon: save.equipped?.weapon || null, armor: save.equipped?.armor || null },
    unlockedRegions: Array.isArray(save.unlockedRegions) ? [...new Set(save.unlockedRegions.filter(id => REGIONS.has(id)))] : ['platform', 'security']
  };
}

export function sanitizeSave(raw) {
  const clean = cloneSave(raw && typeof raw === 'object' ? raw : createInitialSave());
  clean.hero = clean.hero === 'yang_zihao' ? clean.hero : null;
  clean.region = REGIONS.has(clean.region) ? clean.region : 'platform';
  clean.checkpoint = CHECKPOINTS.has(clean.checkpoint) ? clean.checkpoint : 'platform_start';
  clean.quest = QUESTS.includes(clean.quest) ? clean.quest : 'intro';
  clean.maxHealth = 160;
  clean.health = Math.min(clean.maxHealth, Math.max(1, Math.round(Number(clean.health) || clean.maxHealth)));
  clean.gold = Math.max(0, Math.floor(Number(clean.gold) || 0));
  clean.pearls = Math.max(0, Math.floor(Number(clean.pearls) || 0));
  clean.swordRank = Math.min(IMPERIAL_SWORD_MAX_RANK, Math.max(0, Math.floor(Number(clean.swordRank) || 0)));
  clean.bossClears = Math.max(0, Math.floor(Number(clean.bossClears) || 0));
  if (!clean.inventory.includes(clean.equipped.weapon)) clean.equipped.weapon = null;
  if (!clean.inventory.includes(clean.equipped.armor)) clean.equipped.armor = null;
  if (clean.equipped.weapon !== 'imperial_sword') {
    clean.equipped.weapon = clean.inventory.includes('imperial_sword') ? 'imperial_sword' : null;
  }
  clean.updatedAt = typeof clean.updatedAt === 'string' ? clean.updatedAt : new Date(0).toISOString();
  return clean;
}

export function mergeProgressSave(currentRaw, incoming = {}) {
  const current = sanitizeSave(currentRaw);
  const next = cloneSave(current);
  if (incoming.hero === 'yang_zihao' || incoming.hero === null) next.hero = incoming.hero;
  if (REGIONS.has(incoming.region)) next.region = incoming.region;
  if (CHECKPOINTS.has(incoming.checkpoint)) next.checkpoint = incoming.checkpoint;
  if (Number.isFinite(Number(incoming.health))) next.health = Math.min(160, Math.max(1, Math.round(Number(incoming.health))));
  if (QUESTS.includes(incoming.quest)) {
    const from = QUESTS.indexOf(current.quest);
    const to = QUESTS.indexOf(incoming.quest);
    if (to >= from && to <= from + 1) next.quest = incoming.quest;
  }
  if (Array.isArray(incoming.unlockedRegions)) {
    next.unlockedRegions = [...new Set([...current.unlockedRegions, ...incoming.unlockedRegions.filter(id => REGIONS.has(id))])];
  }
  next.updatedAt = new Date().toISOString();
  return sanitizeSave(next);
}

export function applyAction(saveRaw, action = {}) {
  const save = sanitizeSave(saveRaw);
  const next = cloneSave(save);
  let result = {};

  if (action.type === 'buy_item') {
    const item = ITEM_CATALOG[action.itemId];
    if (!item || item.slot !== 'armor' || item.price === null) throw new RuleError('军需商店只能购买护甲');
    if (next.inventory.includes(item.id)) throw new RuleError('已经拥有这件装备');
    if (next.gold < item.price) throw new RuleError(`金币不足，还差 ${item.price - next.gold}`);
    next.gold -= item.price;
    next.inventory.push(item.id);
    result = { message: `获得 ${item.name}`, itemId: item.id };
  } else if (action.type === 'equip_item') {
    const item = ITEM_CATALOG[action.itemId];
    if (!item || !next.inventory.includes(item.id)) throw new RuleError('尚未拥有这件装备');
    if (item.slot === 'weapon' && item.id !== 'imperial_sword') throw new RuleError('当前仅可使用帝王剑');
    next.equipped[item.slot] = item.id;
    result = { message: `已装备 ${item.name}`, itemId: item.id };
  } else if (action.type === 'exchange_armor') {
    if (next.inventory.includes('heavenly_hound_armor')) throw new RuleError('已经拥有天犬甲');
    if (next.pearls < 5) throw new RuleError(`灵珠不足，还差 ${5 - next.pearls}`);
    next.pearls -= 5;
    next.inventory.push('heavenly_hound_armor');
    result = { message: '五颗灵珠共鸣，获得天犬甲', itemId: 'heavenly_hound_armor' };
  } else if (action.type === 'forge_sword') {
    if (!next.inventory.includes('imperial_sword')) throw new RuleError('尚未获得帝王剑');
    if (next.swordRank >= IMPERIAL_SWORD_MAX_RANK) throw new RuleError('帝王剑第四阶暂未开放');
    const cost = SWORD_FORGE_COSTS[next.swordRank];
    if (next.gold < cost.gold) throw new RuleError(`金币不足，还差 ${cost.gold - next.gold}`);
    if (next.pearls < cost.pearls) throw new RuleError(`灵珠不足，还差 ${cost.pearls - next.pearls}`);
    next.gold -= cost.gold;
    next.pearls -= cost.pearls;
    next.swordRank += 1;
    result = { message: `帝王剑锻造至 ${next.swordRank} 阶`, swordRank: next.swordRank, cost };
  } else if (action.type === 'award_sword') {
    if (next.quest !== 'security_complete') throw new RuleError('尚未完成“神的开始”');
    if (!next.inventory.includes('imperial_sword')) next.inventory.push('imperial_sword');
    next.equipped.weapon = 'imperial_sword';
    next.quest = 'sword_awarded';
    if (!next.unlockedRegions.includes('building2_floor1')) next.unlockedRegions.push('building2_floor1');
    result = { message: '获得帝王剑，战斗技能已解锁', itemId: 'imperial_sword' };
  } else if (action.type === 'enemy_defeat') {
    const amount = Math.min(15, Math.max(3, Math.floor(Number(action.amount) || 0)));
    next.gold += amount;
    result = { message: `金币 +${amount}`, gold: amount };
  } else if (action.type === 'boss_clear') {
    const loot = rollBossLoot(Number(action.armorRoll), Number(action.pearlRoll));
    next.gold += 80;
    next.pearls += loot.pearls;
    next.bossClears += 1;
    if (loot.armor && !next.inventory.includes('heavenly_hound_armor')) next.inventory.push('heavenly_hound_armor');
    next.region = 'platform';
    next.checkpoint = 'platform_start';
    result = { message: '子狗已败', gold: 80, armor: loot.armor, pearls: loot.pearls };
  } else {
    throw new RuleError('未知操作');
  }

  next.updatedAt = new Date().toISOString();
  return { save: sanitizeSave(next), result };
}
