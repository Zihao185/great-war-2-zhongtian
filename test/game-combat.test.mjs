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

test('holding space repeats basic attacks without locking movement', () => {
  assert.match(source, /if\(this\.canAct\(\)&&keys\.has\(' '\)\)this\.basicAttack\(\);/);
  assert.match(source, /this\.startPlayerAnimation\(`attack_\$\{p\.attackChain\}`, p\.attackCd, false\);/);
});

test('Pang renders as a standalone transparent Liangzi sprite', () => {
  assert.match(source, /pangSprite\.src = '\/assets\/characters\/liangzi-pang-sprite-v1\.png'/);
  assert.match(source, /const hasPangSprite=e\.bossId==='pang'&&pangSprite\.complete&&pangSprite\.naturalWidth/);
  assert.match(source, /ctx\.drawImage\(pangSprite,-e\.r\*1\.12,-e\.r\*1\.12,e\.r\*2\.24,e\.r\*2\.24\)/);
  assert.match(source, /if\(hasPangSprite\)\{/);
  assert.doesNotMatch(source, /ctx\.clip\(\);ctx\.drawImage\(pangPortrait/);
});
