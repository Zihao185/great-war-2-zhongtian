import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../public/game.js', import.meta.url), 'utf8');

test('unarmed player does not draw the emperor sword', () => {
  assert.match(source, /if\(this\.hasSword\(\)\)\{ctx\.save\(\);ctx\.rotate\(p\.facing\)/);
});

test('rising dragon input is buffered during dash and executes when movement ends', () => {
  assert.match(source, /p\.dashMotion && p\.riseCd <= 0\) \{ p\.queuedRise = true; return; \}/);
  assert.match(source, /if \(p\.queuedRise\) \{ p\.queuedRise = false; this\.performRisingDragon\(true\); \}/);
});
