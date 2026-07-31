import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../public/game.js', import.meta.url), 'utf8');

test('unarmed player hides the emperor sword while the mirror dean always has one', () => {
  assert.match(source, /drawPlayer\(p,time\) \{ this\.drawYangWarrior\(p,time,false\); \}/);
  assert.match(source, /if\(corrupted\|\|this\.hasSword\(\)\)\{/);
});

test('rising dragon input is buffered during dash and executes when movement ends', () => {
  assert.match(source, /p\.dashMotion && p\.riseCd <= 0\) \{ p\.queuedRise = true; return; \}/);
  assert.match(source, /if \(p\.queuedRise\) \{ p\.queuedRise = false; this\.performRisingDragon\(true\); \}/);
});

test('holding space repeats basic attacks without locking movement', () => {
  assert.match(source, /if\(this\.canAct\(\)&&keys\.has\(' '\)\)this\.basicAttack\(\);/);
  assert.match(source, /this\.startPlayerAnimation\(`attack_\$\{p\.attackChain\}`, p\.attackCd, false\);/);
});

test('dark imperial sword has a player-only dark blade aura', () => {
  assert.match(source, /const darkSword=!corrupted&&this\.save\.equipped\?\.weapon==='dark_imperial_sword';/);
  assert.match(source, /if\(darkSword\)\{/);
});

test('the attic dean mirrors player combat and reuses the Yang Zihao model', () => {
  assert.match(source, /this\.mirrorDeanAction\('attack'/);
  assert.match(source, /this\.mirrorDeanAction\('dash'/);
  assert.match(source, /this\.mirrorDeanAction\('rise'/);
  assert.match(source, /this\.mirrorDeanAction\('aura'/);
  assert.match(source, /if\(enemy\.bossId==='dean'\)return this\.updateMirrorDean\(enemy,dt\);/);
  assert.match(source, /this\.drawYangWarrior\(e,time,true\)/);
  assert.match(source, /enemy\.mirror&&enemy\.aura>0\?Math\.ceil\(damage\*\.5\):damage/);
});

test('Pang renders as a standalone transparent Liangzi sprite', () => {
  assert.match(source, /pangSprite\.src = '\/assets\/characters\/liangzi-pang-sprite-v1\.png'/);
  assert.match(source, /const hasPangSprite=e\.bossId==='pang'&&pangSprite\.complete&&pangSprite\.naturalWidth/);
  assert.match(source, /ctx\.drawImage\(pangSprite,-e\.r\*1\.12,-e\.r\*1\.12,e\.r\*2\.24,e\.r\*2\.24\)/);
  assert.match(source, /if\(hasPangSprite\)\{/);
  assert.doesNotMatch(source, /ctx\.clip\(\);ctx\.drawImage\(pangPortrait/);
});
