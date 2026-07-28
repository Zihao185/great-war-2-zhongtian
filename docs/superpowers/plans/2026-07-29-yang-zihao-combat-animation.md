# 杨子豪战斗动作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the playable, sword-equipped Yang Zihao distinct four-direction combat animations that stay synchronized with combat timing, effects, hit detection, movement, damage, death, and the existing save system.

**Architecture:** Add a small, DOM-free animation utility that resolves state priority, direction rows, and deterministic frame timing. `GreatWarGame` keeps a `player.animation` record and turns each action into a time-bounded state; `drawPlayer` selects the matching sprite-sheet cell with a graceful fallback. Dash motion is interpolated during its active animation rather than an instantaneous teleport, without changing its distance, damage targets, cooldown, or invulnerability.

**Tech Stack:** Browser Canvas 2D, ES modules, Node.js built-in test runner, PNG sprite sheets generated with AICodeWith and made transparent with Pillow where required.

## Global Constraints

- Keep Node.js `>=23.0.0`, browser Canvas 2D, and no new runtime dependency.
- Preserve all existing keys: WASD, Space, J, K, L, F, Escape.
- Preserve current combat values: basic attack 94px, dash 260px / 3s cooldown / 0.22s invulnerability, rising dragon 115px / 5s cooldown, Imperial Aura 5s.
- Keep the unarmed player drawing and all “帝王剑尚未入手” lockouts before the sword quest reward.
- Battle artwork must be an original transparent PNG and must keep Yang Zihao’s closed helmet, gunmetal/deep-teal armor, restrained gold trim, short dark cape, and long narrow Emperor Sword.
- Never write image-generation credentials to the repository, terminal output, source, assets, or documentation.

---

### Task 1: Add deterministic player-animation helpers

**Files:**
- Create: `public/player-animation.js`
- Create: `test/player-animation.test.mjs`

**Interfaces:**
- Produces `PLAYER_ANIMATION_PRIORITY: readonly string[]`, ordered as `dead`, `hurt`, `aura_cast`, `rise_combo`, `rise`, `dash`, `attack_3`, `attack_2`, `attack_1`, `run`, `aura_idle`, `idle`.
- Produces `directionRow(facing: number): 0 | 1 | 2 | 3`; rows mean down, left, right, up.
- Produces `frameAt(elapsed: number, duration: number, frameCount: number): number`; clamps elapsed and returns a zero-based frame index.
- Produces `resolveAnimationState(input: { dead: boolean, hurt: number, aura: number, action: string | null, moving: boolean }): string`.

- [ ] **Step 1: Write the failing test**

Create `test/player-animation.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/player-animation.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `public/player-animation.js`.

- [ ] **Step 3: Write the minimal implementation**

Create `public/player-animation.js`:

```js
export const PLAYER_ANIMATION_PRIORITY = Object.freeze([
  'dead', 'hurt', 'aura_cast', 'rise_combo', 'rise', 'dash',
  'attack_3', 'attack_2', 'attack_1', 'run', 'aura_idle', 'idle'
]);

export function directionRow(facing) {
  const horizontal = Math.cos(facing);
  const vertical = Math.sin(facing);
  if (Math.abs(vertical) >= Math.abs(horizontal)) return vertical >= 0 ? 0 : 3;
  return horizontal < 0 ? 1 : 2;
}

export function frameAt(elapsed, duration, frameCount) {
  if (frameCount <= 1 || duration <= 0) return 0;
  const progress = Math.min(1, Math.max(0, elapsed / duration));
  return Math.min(frameCount - 1, Math.floor(progress * frameCount));
}

export function resolveAnimationState({ dead, hurt, aura, action, moving }) {
  if (dead) return 'dead';
  if (hurt > 0) return 'hurt';
  if (action) return action;
  if (moving) return 'run';
  return aura > 0 ? 'aura_idle' : 'idle';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/player-animation.test.mjs`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add public/player-animation.js test/player-animation.test.mjs
git commit -m "feat: add player animation state helpers"
```

### Task 2: Produce battle sprite sheets with transparent backgrounds

**Files:**
- Create: `public/assets/characters/yang-zihao-slash-sprites-v1.png`
- Create: `public/assets/characters/yang-zihao-skill-sprites-v1.png`
- Create: `public/assets/characters/yang-zihao-aura-sprites-v1.png`

**Interfaces:**
- `yang-zihao-slash-sprites-v1.png` is a 4 columns × 4 rows sheet: rows down, left, right, up; columns wind-up, contact, follow-through, recovery.
- `yang-zihao-skill-sprites-v1.png` is an 8 rows × 4 columns sheet: rows 0–3 are dash down/left/right/up; rows 4–7 are rising-dragon down/left/right/up; each row is wind-up, release, impact, recovery.
- `yang-zihao-aura-sprites-v1.png` is a 4 columns × 4 rows sheet: rows down, left, right, up; columns sword-plant, gathering aura, expanding aura, ready stance.

- [ ] **Step 1: Obtain explicit AICodeWith parameter confirmation before generation**

Show the user this exact parameter set and wait for an affirmative response before any API request:

```text
请确认本次生图参数：
- 模型：gpt-image-2
- 比例：1:1
- 数量：1（每张动作图单独生成，共 3 张）
- 质量：high
- 分辨率：4K

确认后我再开始生成。
```

- [ ] **Step 2: Generate each sheet using three separate tasks**

Submit one UTF-8 JSON request per prompt. Do not place the API key or non-ASCII prompt in a shell command. Use the AICodeWith API and poll the returned task ID until `completed`.

Use this shared art direction in every prompt: `original high-detail 2D action RPG game sprite sheet, isolated full-body character, transparent alpha-ready background, no UI, no text, no logo, no scene, exact consistent character design: completely closed helmet with no visible face, deep teal and gunmetal plate armor, cold silver edges, restrained imperial gold trim, short black cape, a thin realistic long Emperor Sword; compact top-down readable pose, centered within every cell, equal cell margins, crisp painted 2D game art`.

Use these sheet-specific additions:

```text
Slash sheet: exactly 4 columns by 4 rows, no grid lines. Rows are down-facing, left-facing, right-facing, up-facing. Every row shows the same four consecutive sword-slash frames: wind-up, blade contact, follow-through, recovery. The Emperor Sword must remain long and narrow. No magic effect obscures the body.

Skill sheet: exactly 4 columns by 8 rows, no grid lines. Rows 1-4 are down-facing, left-facing, right-facing, up-facing dash frames: crouched wind-up, low forward burst, sword-forward impact, braking recovery. Rows 5-8 are matching directions for rising-dragon frames: low guard, upward sword launch, high upward follow-through, landing recovery. The body must be visible in every cell; use only restrained teal energy for dash and gold-teal vertical sword energy for rising dragon.

Aura sheet: exactly 4 columns by 4 rows, no grid lines. Rows are down-facing, left-facing, right-facing, up-facing. Every row shows the same four consecutive Imperial Aura frames: planting the sword, gathering a small gold light, aura expanding outward, upright ready stance with a thin gold aura ring. No floating text and no opaque background.
```

- [ ] **Step 3: Normalize backgrounds and preserve grid layout**

Download completed images into `/private/tmp/`. Inspect each in the image viewer. If the generator used a gray/white checkerboard instead of alpha, replace only checkerboard pixels that connect to the image edge with alpha using a Pillow flood-fill; do not erase highlights enclosed by armor or sword outlines. Save the final PNGs to the three paths above. Use `identify -verbose` or Pillow to verify RGBA mode and nonzero transparent pixels.

- [ ] **Step 4: Confirm the assets are servable**

Run:

```bash
file public/assets/characters/yang-zihao-*-sprites-v1.png
curl -I http://127.0.0.1:3100/assets/characters/yang-zihao-slash-sprites-v1.png
curl -I http://127.0.0.1:3100/assets/characters/yang-zihao-skill-sprites-v1.png
curl -I http://127.0.0.1:3100/assets/characters/yang-zihao-aura-sprites-v1.png
```

Expected: every file is a PNG and every local request returns `HTTP/1.1 200`.

- [ ] **Step 5: Commit**

```bash
git add public/assets/characters/yang-zihao-slash-sprites-v1.png public/assets/characters/yang-zihao-skill-sprites-v1.png public/assets/characters/yang-zihao-aura-sprites-v1.png
git commit -m "feat: add Yang Zihao combat sprite sheets"
```

### Task 3: Add the runtime animation controller and synchronize combat actions

**Files:**
- Modify: `public/game.js:1-18`
- Modify: `public/game.js:107-110`
- Modify: `public/game.js:204-249`
- Modify: `public/game.js:280-300`
- Modify: `public/game.js:383-401`

**Interfaces:**
- Consumes `directionRow`, `frameAt`, and `resolveAnimationState` from `./player-animation.js`.
- Adds `player.animation` as `{ action: string | null, elapsed: number, duration: number, locked: boolean }` and `player.attackChain` / `player.attackChainTimer`.
- Adds `startPlayerAnimation(action: string, duration: number, locked?: boolean): void`, `advancePlayerAnimation(dt: number): void`, `drawSheetSprite(image: HTMLImageElement, row: number, frame: number, columns: number, rows: number, size: number): boolean`.

- [ ] **Step 1: Add image handles and player state**

At the top of `public/game.js`, import the three pure helpers and add image elements for slash, skill, and aura assets beside `playerSprite`. In `createPlayer`, append:

```js
animation: { action: null, elapsed: 0, duration: 0, locked: false },
attackChain: 0,
attackChainTimer: 0,
dashMotion: null
```

Each image source must use the root-relative `/assets/characters/...` URL. Existing run-sheet loading remains unchanged.

- [ ] **Step 2: Add a controller that cannot leave the player locked forever**

Add these methods inside `GreatWarGame`:

```js
startPlayerAnimation(action, duration, locked = true) {
  this.player.animation = { action, elapsed: 0, duration, locked };
}

advancePlayerAnimation(dt) {
  const p = this.player;
  p.attackChainTimer = Math.max(0, p.attackChainTimer - dt);
  if (p.attackChainTimer === 0) p.attackChain = 0;
  if (!p.animation.action) return;
  p.animation.elapsed += dt;
  if (p.animation.elapsed >= p.animation.duration) {
    p.animation = { action: null, elapsed: 0, duration: 0, locked: false };
  }
}
```

Call `advancePlayerAnimation(dt)` at the beginning of `update`. Update `updateMovement` so `p.moving` is false and direct WASD movement is skipped while `p.animation.locked` is true. Do not skip all `update` work: enemies, bullets, particles, camera, damage, UI and save behavior must keep running.

- [ ] **Step 3: Use three attack states and delay dash position over its existing 0.18 second burst**

In `basicAttack`, after the existing cooldown check, increment `attackChain` modulo three when its 0.75 second timer is still active; otherwise begin at 1. Set `attackChainTimer = .75`, set action `attack_${attackChain}`, and call `startPlayerAnimation` with the current `attackCd` and `locked = true`. Keep the current 94px hit calculation and hit/heal/musou logic.

In `castDash`, retain the current `start`, `end`, path-target calculation, `dashCd = 3`, `comboWindow = .8`, `invuln = .22`, effect and burst. Replace immediate `p.x = end.x; p.y = end.y` with:

```js
p.dashMotion = { start, end, elapsed: 0, duration: .18 };
this.startPlayerAnimation('dash', .44, true);
```

In `advancePlayerAnimation`, when `p.dashMotion` exists, increase `elapsed`, compute `t = Math.min(1, elapsed / duration)`, use `t * t * (3 - 2 * t)` for easing, update `p.x` and `p.y` between `start` and `end`, then clear `dashMotion` at `t === 1`. Keep damage on the already computed path so gameplay coverage remains unchanged.

In `castRisingDragon`, call `startPlayerAnimation(combo ? 'rise_combo' : 'rise', .50, true)` after setting the combo values. In `castImperialAura`, call `startPlayerAnimation('aura_cast', .35, true)` before the existing burst. In `damagePlayer`, call `startPlayerAnimation('hurt', .20, false)` after setting `p.hurt`; when HP reaches zero set `animation.action = 'dead'`, `animation.duration = Infinity`, `animation.locked = true`.

- [ ] **Step 4: Render the correct sheet, direction, and frame with fallback**

Replace the current single run-sheet branch in `drawPlayer` with an animation-state branch after aura/shadow/invulnerability rendering. Calculate:

```js
const state = resolveAnimationState({
  dead: this.dead,
  hurt: p.hurt,
  aura: p.aura,
  action: p.animation.action,
  moving: p.moving
});
const row = directionRow(p.facing);
const elapsed = p.animation.elapsed;
const duration = p.animation.duration || 1;
```

Map `attack_1`, `attack_2`, and `attack_3` to the slash sheet (four columns, four rows); map `dash` to skill sheet row `row`; map `rise` to skill sheet row `row + 4`; map `rise_combo` to the same rising frames with existing gold-combo color and 1.08 render scale; map `aura_cast` to aura sheet. Use `frameAt(elapsed, duration, 4)` for every battle sheet. Map `run` to the existing run sheet with its existing 10fps frame rate; `idle`, `aura_idle`, `hurt` and `dead` use frame 1 of the run sheet while aura/hurt/death effects remain visible.

Create `drawSheetSprite` to return false if an image has not finished loading or has no natural width. If it returns false, draw the existing simple-player fallback instead. Do not `return` before `ctx.restore()` in any branch.

- [ ] **Step 5: Preserve visual combat feedback**

Keep `attackFx` rendering. Change only its visual timing to match animation windows: arc lasts `.30`, dash line lasts `.28`, rise curve lasts `.42`. In `drawPlayer`, apply a 1.03 sinusoidal scale for `aura_idle`, a brief red-tinted overlay for `hurt`, and a low 90-degree rotation plus reduced alpha for `dead`. These are visual-only and must not alter collision radius, HP, armor, loot, quest state, or save payload.

- [ ] **Step 6: Run focused and full verification**

Run:

```bash
node --check public/game.js
node --test test/player-animation.test.mjs test/client-rules.test.mjs
npm test
```

Expected: syntax check succeeds; focused tests and full suite pass without failure.

- [ ] **Step 7: Commit**

```bash
git add public/game.js public/player-animation.js test/player-animation.test.mjs
git commit -m "feat: animate Yang Zihao combat actions"
```

### Task 4: Validate the playable game and publish it

**Files:**
- Modify only if a defect is found in: `public/game.js`, `public/player-animation.js`, `test/player-animation.test.mjs`

**Interfaces:**
- Consumes the Task 2 assets and Task 3 animation controller.
- Produces a pushed `main` branch and an updated public game at the existing tunnel URL.

- [ ] **Step 1: Perform a manual browser acceptance pass**

Open `http://127.0.0.1:3100`, log into an account with 帝王剑, and verify all four directions for:

1. idle and WASD run;
2. Space pressed three times within 0.75 seconds;
3. J dash through an enemy and J then K within the `.8` second combo window;
4. K on its own;
5. L when 无双 reaches 100, then an aura-speed basic attack;
6. enemy hit, zero HP death, and checkpoint respawn;
7. reload after an autosave.

Expected: each ability changes the actual player pose; the action never sticks; movement resumes after the action; the complete game remains playable when a sprite request is intentionally blocked in DevTools.

- [ ] **Step 2: Check repository changes and publish**

Run:

```bash
git status --short
git log --oneline -4
git push
git status --short --branch
```

Expected: only intended files are committed, `git push` succeeds, and the branch reports no ahead/behind markers.

- [ ] **Step 3: Hand off**

Tell the user that the new battle animation is live, mention the Space/J/K/L action coverage, and provide the public URL `https://washing-apron-dipping.ngrok-free.dev`.
