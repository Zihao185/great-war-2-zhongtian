export const ITEMS = Object.freeze({
  imperial_sword: { id: 'imperial_sword', name: '帝王剑', slot: 'weapon', attack: 35, price: null, rarity: 'quest', copy: '王子毅授予的中天帝剑，可用子狗灵珠锻造。' },
  dark_imperial_sword: { id: 'dark_imperial_sword', name: '黑暗帝王剑', slot: 'weapon', attack: 65, price: null, rarity: 'legendary', copy: '院长黑化之力凝成的帝锋，三阶之上再增五点攻击。' },
  guard_broadsword: { id: 'guard_broadsword', name: '城卫阔剑', slot: 'weapon', attack: 42, price: 180, rarity: 'common', copy: '制式厚刃，沉稳可靠。' },
  iron_sword: { id: 'iron_sword', name: '玄铁长剑', slot: 'weapon', attack: 55, price: 330, rarity: 'rare', copy: '掺入玄铁的帝都长剑。' },
  breaker_blade: { id: 'breaker_blade', name: '破军重锋', slot: 'weapon', attack: 72, price: 620, rarity: 'epic', copy: '为正面撕开重甲而锻造。' },
  guard_armor: { id: 'guard_armor', name: '城卫软甲', slot: 'armor', reduction: 0.08, price: 160, rarity: 'common', copy: '轻便的巡城防护。' },
  iron_armor: { id: 'iron_armor', name: '玄铁胸甲', slot: 'armor', reduction: 0.16, price: 330, rarity: 'rare', copy: '玄铁片在行动间彼此咬合。' },
  breaker_armor: { id: 'breaker_armor', name: '破军铠', slot: 'armor', reduction: 0.25, price: 620, rarity: 'epic', copy: '中天破阵军的重铠。' },
  heavenly_hound_armor: { id: 'heavenly_hound_armor', name: '天犬甲', slot: 'armor', reduction: 0.42, price: null, rarity: 'legendary', copy: '子狗之力凝成的传说护甲。' }
});

export const IMPERIAL_SWORD_MAX_RANK = 3;
export const IMPERIAL_SWORD_ATTACK_BY_RANK = Object.freeze([35, 45, 55, 60]);
export const DARK_IMPERIAL_SWORD_ATTACK = 65;
export const SECURITY_SURVIVAL_SECONDS = 30;

export function weaponAttack(save) {
  if (save.equipped?.weapon === 'dark_imperial_sword') return DARK_IMPERIAL_SWORD_ATTACK;
  if (save.equipped?.weapon !== 'imperial_sword') return 0;
  const rank = Math.min(IMPERIAL_SWORD_MAX_RANK, Math.max(0, Math.floor(Number(save.swordRank) || 0)));
  return IMPERIAL_SWORD_ATTACK_BY_RANK[rank];
}

export function lifeStealAmount(save) {
  if (save.equipped?.weapon === 'dark_imperial_sword') return 30;
  const rank = Math.min(IMPERIAL_SWORD_MAX_RANK, Math.max(0, Math.floor(Number(save.swordRank) || 0)));
  return rank >= IMPERIAL_SWORD_MAX_RANK ? 30 : 10;
}

export function armorReduction(save) { return ITEMS[save.equipped?.armor]?.reduction || 0; }
export function actualDamage(base, reduction, aura = false) {
  const afterArmor = Math.ceil(base - reduction * base);
  return Math.max(1, aura ? Math.ceil(afterArmor * 0.5) : afterArmor);
}

export function segmentCircleHit(start, end, circle, padding = 0) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((circle.x - start.x) * dx + (circle.y - start.y) * dy) / lengthSq));
  const px = start.x + dx * t, py = start.y + dy * t;
  return Math.hypot(circle.x - px, circle.y - py) <= (circle.r || 0) + padding;
}

export function reflectBullet(bullet, bounds) {
  let reflected = false;
  if (bullet.x - bullet.r <= bounds.x && bullet.vx < 0) { bullet.x = bounds.x + bullet.r; bullet.vx *= -1; reflected = true; }
  if (bullet.x + bullet.r >= bounds.x + bounds.w && bullet.vx > 0) { bullet.x = bounds.x + bounds.w - bullet.r; bullet.vx *= -1; reflected = true; }
  if (bullet.y - bullet.r <= bounds.y && bullet.vy < 0) { bullet.y = bounds.y + bullet.r; bullet.vy *= -1; reflected = true; }
  if (bullet.y + bullet.r >= bounds.y + bounds.h && bullet.vy > 0) { bullet.y = bounds.y + bounds.h - bullet.r; bullet.vy *= -1; reflected = true; }
  if (reflected) bullet.bounces = (bullet.bounces || 0) + 1;
  return bullet;
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
