import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ITEM_CATALOG,
  applyAction,
  calculateDamage,
  createInitialSave,
  getWeaponAttack,
  mergeProgressSave,
  rollBossLoot
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

test('shop purchase and equip are server-rule controlled', () => {
  const initial = { ...createInitialSave(), gold: 330 };
  const bought = applyAction(initial, { type: 'buy_item', itemId: 'iron_sword' }).save;
  assert.equal(bought.gold, 0);
  assert.ok(bought.inventory.includes('iron_sword'));
  const equipped = applyAction(bought, { type: 'equip_item', itemId: 'iron_sword' }).save;
  assert.equal(equipped.equipped.weapon, 'iron_sword');
  assert.equal(getWeaponAttack(equipped), ITEM_CATALOG.iron_sword.attack);
});

test('five pearls exchange armor and three pearls forge up to rank nine', () => {
  const initial = { ...createInitialSave(), pearls: 8, inventory: ['imperial_sword'], equipped: { weapon: 'imperial_sword', armor: null } };
  const armor = applyAction(initial, { type: 'exchange_armor' }).save;
  assert.equal(armor.pearls, 3);
  assert.ok(armor.inventory.includes('heavenly_hound_armor'));
  const forged = applyAction(armor, { type: 'forge_sword' }).save;
  assert.equal(forged.pearls, 0);
  assert.equal(forged.swordRank, 1);
  assert.equal(getWeaponAttack(forged), 40);
  assert.throws(() => applyAction({ ...forged, swordRank: 9, pearls: 3 }, { type: 'forge_sword' }), /最高阶/);
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
