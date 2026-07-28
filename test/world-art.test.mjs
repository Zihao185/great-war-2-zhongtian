import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_ART, drawWorldArt, worldArtDefinition } from '../public/world-art.js';

test('every playable region has a local cursed-community art definition', () => {
  const ids = ['platform', 'security', 'building2_floor1', 'building2_floor2', 'building2_boss'];
  assert.deepEqual(Object.keys(WORLD_ART).sort(), ids.sort());
  for (const id of ids) {
    const entry = worldArtDefinition(id);
    assert.ok(entry.src.startsWith('/assets/world/'));
    assert.match(entry.src, /-v1\.png$/);
    assert.ok(entry.ratio.length > 0);
  }
});

test('unknown regions have no art definition', () => {
  assert.equal(worldArtDefinition('building1_floor1'), null);
});

test('art drawing falls back cleanly outside the browser', () => {
  const ctx = { drawImage() { throw new Error('must not draw without a browser image'); } };
  assert.equal(drawWorldArt(ctx, 'platform', 3600, 2500), false);
});
