import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAction,
  calculateDamage,
  createInitialSave,
  getWeaponAttack,
  mergeProgressSave,
  rollBossLoot,
  sanitizeSave
} from '../src/rules.mjs';

test('damage follows armor formula and imperial aura halves the result', () => {
  assert.equal(calculateDamage(100, 0.42), 58);
  assert.equal(calculateDamage(100, 0.42, true), 29);
  assert.equal(calculateDamage(1, 0.99, false), 1);
});

test('boss loot uses exact exclusive thresholds', () => {
  assert.deepEqual(rollBossLoot(0.0499, 0.2499), { armor: true, pearls: 1 });
  assert.deepEqual(rollBossLoot(0.05, 0.25), { armor: false, pearls: 0 });
});

test('shop accepts armor only and historical weapons cannot be equipped', () => {
  const initial = {
    ...createInitialSave(), gold: 330,
    inventory: ['guard_broadsword', 'imperial_sword'],
    equipped: { weapon: 'guard_broadsword', armor: null }
  };
  const sanitized = sanitizeSave(initial);
  assert.equal(sanitized.equipped.weapon, 'imperial_sword');
  assert.throws(() => applyAction(sanitized, { type: 'buy_item', itemId: 'guard_broadsword' }), /只能购买护甲/);
  const bought = applyAction(sanitized, { type: 'buy_item', itemId: 'iron_armor' }).save;
  assert.equal(bought.gold, 0);
  assert.ok(bought.inventory.includes('iron_armor'));
  assert.throws(() => applyAction(bought, { type: 'equip_item', itemId: 'guard_broadsword' }), /当前仅可使用帝王剑/);
});

test('five pearls exchange armor', () => {
  const initial = { ...createInitialSave(), pearls: 5 };
  const armor = applyAction(initial, { type: 'exchange_armor' }).save;
  assert.equal(armor.pearls, 0);
  assert.ok(armor.inventory.includes('heavenly_hound_armor'));
});

test('imperial sword uses two gold upgrades then five-pearl breakthrough and stops at rank three', () => {
  const initial = { ...createInitialSave(), gold: 3000, pearls: 5, inventory: ['imperial_sword'], equipped: { weapon: 'imperial_sword', armor: null } };
  const rank1 = applyAction(initial, { type: 'forge_sword' }).save;
  assert.deepEqual([rank1.swordRank, rank1.gold, getWeaponAttack(rank1)], [1, 2000, 45]);
  const rank2 = applyAction(rank1, { type: 'forge_sword' }).save;
  assert.deepEqual([rank2.swordRank, rank2.gold, getWeaponAttack(rank2)], [2, 0, 55]);
  const rank3 = applyAction(rank2, { type: 'forge_sword' }).save;
  assert.deepEqual([rank3.swordRank, rank3.pearls, getWeaponAttack(rank3)], [3, 0, 60]);
  assert.throws(() => applyAction(rank3, { type: 'forge_sword' }), /第四阶暂未开放/);
});

test('save sanitation caps historical sword ranks at three', () => {
  const save = sanitizeSave({ ...createInitialSave(), swordRank: 99, inventory: ['imperial_sword'], equipped: { weapon: 'imperial_sword', armor: null } });
  assert.equal(save.swordRank, 3);
  assert.equal(getWeaponAttack(save), 60);
});

test('progress merge cannot forge gold, pearls, gear, or boss clears', () => {
  const current = { ...createInitialSave(), gold: 10, pearls: 1, bossClears: 2 };
  const merged = mergeProgressSave(current, {
    region: 'security', checkpoint: 'security_entry', health: 77,
    gold: 99999, pearls: 999, bossClears: 99, inventory: ['heavenly_hound_armor']
  });
  assert.equal(merged.region, 'security');
  assert.equal(merged.health, 77);
  assert.equal(merged.gold, 10);
  assert.equal(merged.pearls, 1);
  assert.equal(merged.bossClears, 2);
  assert.deepEqual(merged.inventory, []);
});
