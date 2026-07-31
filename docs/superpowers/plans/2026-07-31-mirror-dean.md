# Mirror Dean Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the attic dean a real-time Yang Zihao combat mirror.

**Architecture:** `public/world.js` creates a dean with the hero collision profile. `public/game.js` emits a mirror action after every successful player attack or skill, advances a separate dean action state, and renders both actors through the same Yang Zihao Canvas helper.

**Tech Stack:** Native Canvas, browser ES modules, Node.js test runner.

## Global Constraints

- The dean must not use the old fire or autonomous melee behavior.
- A player action mirrors immediately from the dean's own position and uses normal range checks.
- The dean uses the equipped Imperial Sword rank, 5-second aura, 50% aura damage reduction, and rank-based lifesteal.
- Existing attic rewards, key progression, and death penalty remain unchanged.

---

### Task 1: Define the Mirror State

**Files:**
- Modify: `public/world.js:82-84`
- Modify: `public/game.js:122-128, 149-156`
- Test: `test/client-rules.test.mjs`

**Interfaces:**
- Produces dean fields `facing`, `aura`, `dragonBlood`, `dashMotion`, and `animation` for the combat controller.

- [ ] **Step 1: Add a failing world assertion**

```js
const dean = createRegionEnemies('building1_attic').find(enemy => enemy.bossId === 'dean');
assert.equal(dean.r, 18);
assert.equal(dean.speed, 265);
```

- [ ] **Step 2: Run the focused test**

Run: `node --test test/client-rules.test.mjs`
Expected: FAIL because the former dean configuration has radius `50` and speed `132`.

- [ ] **Step 3: Add the mirror configuration and transient state**

```js
dean: { name: '黑化院长', hp: 2850, speed: 265, damage: 0, r: 18, boss: true, bossId: 'dean', mirror: true }
return { ..., facing: Math.PI, aura: 0, dragonBlood: 0, dashMotion: null, animation: { action: null, elapsed: 0, duration: 0, locked: false }, ...configs };
```

- [ ] **Step 4: Re-run the focused test**

Run: `node --test test/client-rules.test.mjs`
Expected: PASS.

### Task 2: Mirror Attacks and Hero Rendering

**Files:**
- Modify: `public/game.js:240-290, 338-426, 487-545`
- Test: `test/game-combat.test.mjs`

**Interfaces:**
- Consumes: a live `enemy` where `enemy.bossId === 'dean'`.
- Produces: `mirrorDeanAction(action, options)`, `updateMirrorDean(dean, dt)`, and `drawYangWarrior(actor, time, corrupted)`.

- [ ] **Step 1: Add failing source-level regression assertions**

```js
assert.match(source, /this\.mirrorDeanAction\('attack'/);
assert.match(source, /this\.mirrorDeanAction\('dash'/);
assert.match(source, /this\.mirrorDeanAction\('rise'/);
assert.match(source, /this\.mirrorDeanAction\('aura'/);
assert.match(source, /this\.drawYangWarrior\(e,time,true\)/);
```

- [ ] **Step 2: Run the focused test**

Run: `node --test test/game-combat.test.mjs`
Expected: FAIL because no mirror action controller exists.

- [ ] **Step 3: Implement immediate event mirroring**

```js
mirrorDeanAction(action, options = {}) {
  const dean = this.enemies.find(enemy => enemy.bossId === 'dean' && !enemy.dead);
  if (!dean) return;
  dean.facing = Math.atan2(this.player.y - dean.y, this.player.x - dean.x);
  // Dispatch attack, dash, rise, or aura with the matching player values.
}
```

- [ ] **Step 4: Implement independent dean animation, motion, effects, and aura reduction**

```js
if (enemy.bossId === 'dean') return this.updateMirrorDean(enemy, dt);
const dealt = enemy.mirror && enemy.aura > 0 ? Math.ceil(damage * .5) : damage;
```

- [ ] **Step 5: Reuse the Yang Zihao draw helper for both combatants**

```js
drawPlayer(player, time) { this.drawYangWarrior(player, time, false); }
if (e.bossId === 'dean') { this.drawYangWarrior(e, time, true); return; }
```

- [ ] **Step 6: Run full verification**

Run: `npm test && node --check public/game.js public/world.js && git diff --check`
Expected: all tests pass with no syntax or whitespace errors.
