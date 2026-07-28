import test from 'node:test';
import assert from 'node:assert/strict';
import { directionRow, frameAt, resolveAnimationState } from '../public/player-animation.js';

test('directions map down, left, right, up to their sprite rows', () => {
  assert.equal(directionRow(Math.PI / 2), 0);
  assert.equal(directionRow(Math.PI), 1);
  assert.equal(directionRow(0), 2);
  assert.equal(directionRow(-Math.PI / 2), 3);
});

test('frame selection is deterministic and capped at the last frame', () => {
  assert.equal(frameAt(0, .4, 4), 0);
  assert.equal(frameAt(.21, .4, 4), 2);
  assert.equal(frameAt(.4, .4, 4), 3);
  assert.equal(frameAt(2, .4, 4), 3);
});

test('combat states outrank movement and aura idle', () => {
  assert.equal(resolveAnimationState({ dead: false, hurt: 0, aura: 5, action: 'dash', moving: true }), 'dash');
  assert.equal(resolveAnimationState({ dead: false, hurt: .2, aura: 5, action: 'dash', moving: true }), 'hurt');
  assert.equal(resolveAnimationState({ dead: true, hurt: .2, aura: 5, action: 'dash', moving: true }), 'dead');
  assert.equal(resolveAnimationState({ dead: false, hurt: 0, aura: 5, action: null, moving: false }), 'aura_idle');
});
