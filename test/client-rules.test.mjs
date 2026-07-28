import test from 'node:test';
import assert from 'node:assert/strict';
import { SECURITY_SURVIVAL_SECONDS, actualDamage, reflectBullet, segmentCircleHit, weaponAttack } from '../public/rules.js';

test('security challenge requires thirty uninterrupted seconds', () => {
  assert.equal(SECURITY_SURVIVAL_SECONDS, 30);
});

test('bullet reflection changes velocity and counts wall rebounds', () => {
  const bullet = { x: 4, y: 50, r: 5, vx: -100, vy: 20, bounces: 0 };
  reflectBullet(bullet, { x: 0, y: 0, w: 100, h: 100 });
  assert.equal(bullet.x, 5);
  assert.equal(bullet.vx, 100);
  assert.equal(bullet.bounces, 1);
});

test('dash segment hits enemies on the path but not outside it', () => {
  assert.equal(segmentCircleHit({ x: 0, y: 0 }, { x: 260, y: 0 }, { x: 130, y: 20, r: 12 }, 10), true);
  assert.equal(segmentCircleHit({ x: 0, y: 0 }, { x: 260, y: 0 }, { x: 130, y: 40, r: 12 }, 10), false);
});

test('client display rules match server equipment rules', () => {
  const save = { swordRank: 9, equipped: { weapon: 'imperial_sword', armor: 'heavenly_hound_armor' } };
  assert.equal(weaponAttack(save), 80);
  assert.equal(actualDamage(100, 0.42, false), 58);
  assert.equal(actualDamage(100, 0.42, true), 29);
});
