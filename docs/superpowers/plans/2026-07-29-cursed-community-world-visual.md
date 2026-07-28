# 中天魔化小区世界视觉 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abstract platform, security office, and Building 2 visuals with original dark, realistic cursed-community environments while retaining the current playable world, interactions, combat, and persistence.

**Architecture:** Store one local bitmap background per playable region and draw it at the existing region coordinates. A small browser-only asset module returns `false` until an image has loaded, allowing `world.js` to render its current Canvas geometry as a complete fallback; once ready, `world.js` renders the bitmap followed by dynamic lights, gates, teleporter, NPC/shops, enemies, bullets and interaction feedback.

**Tech Stack:** ES modules, Canvas 2D, browser `Image`, Node.js built-in test runner, AICodeWith `gpt-image-2`, original local PNG assets.

## Global Constraints

- Preserve `REGIONS` dimensions, spawn/checkpoint coordinates, `getInteractions` IDs/positions/radii, enemy positions, quest flags, item rules, save schema and all input keys.
- Use original “cursed old residential community” imagery: old concrete apartments, barred windows, balconies, utility pipes, rust, wet ground, warm occupancy lights, black-red corruption; no campus, office park, sci-fi compound, copyrighted game assets, UI or text inside images.
- Keep moving actors and gameplay feedback visible over backgrounds; foreground art cannot cover player, enemies, bullet paths, HUD or interaction prompts.
- Never commit API credentials, remote source URLs, task responses or generated prompt payloads.
- Keep local Canvas fallback paths so an unavailable background image cannot result in a blank or non-playable map.

---

### Task 1: Define region art metadata and test fallback-safe mapping

**Files:**
- Create: `public/world-art.js`
- Create: `test/world-art.test.mjs`

**Interfaces:**
- Produces `WORLD_ART: Readonly<Record<string, { src: string, ratio: string }>>` for `platform`, `security`, `building2_floor1`, `building2_floor2`, `building2_boss`.
- Produces `drawWorldArt(ctx: CanvasRenderingContext2D, regionId: string, width: number, height: number): boolean`; it draws only a fully loaded local image and returns `false` for missing/failed/not-yet-loaded images.
- Produces `worldArtDefinition(regionId: string): { src: string, ratio: string } | null`.

- [ ] **Step 1: Write the failing test**

Create `test/world-art.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_ART, worldArtDefinition } from '../public/world-art.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/world-art.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `public/world-art.js`.

- [ ] **Step 3: Write the implementation**

Create `public/world-art.js`:

```js
export const WORLD_ART = Object.freeze({
  platform: { src: '/assets/world/zhongtian-platform-cursed-community-v1.png', ratio: '3:2' },
  security: { src: '/assets/world/security-office-cursed-community-v1.png', ratio: '3:2' },
  building2_floor1: { src: '/assets/world/building2-lobby-cursed-community-v1.png', ratio: '5:3' },
  building2_floor2: { src: '/assets/world/building2-corridor-cursed-community-v1.png', ratio: '2:1' },
  building2_boss: { src: '/assets/world/building2-property-office-cursed-community-v1.png', ratio: '5:3' }
});

const images = new Map();

export function worldArtDefinition(regionId) {
  return WORLD_ART[regionId] || null;
}

function imageFor(regionId) {
  const definition = worldArtDefinition(regionId);
  if (!definition || typeof Image === 'undefined') return null;
  if (!images.has(regionId)) {
    const image = new Image();
    image.src = definition.src;
    images.set(regionId, image);
  }
  return images.get(regionId);
}

export function drawWorldArt(ctx, regionId, width, height) {
  const image = imageFor(regionId);
  if (!image?.complete || !image.naturalWidth) return false;
  ctx.drawImage(image, 0, 0, width, height);
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/world-art.test.mjs`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add public/world-art.js test/world-art.test.mjs
git commit -m "feat: add cursed community world art loader"
```

### Task 2: Generate and verify five original region backgrounds

**Files:**
- Create: `public/assets/world/zhongtian-platform-cursed-community-v1.png`
- Create: `public/assets/world/security-office-cursed-community-v1.png`
- Create: `public/assets/world/building2-lobby-cursed-community-v1.png`
- Create: `public/assets/world/building2-corridor-cursed-community-v1.png`
- Create: `public/assets/world/building2-property-office-cursed-community-v1.png`

**Interfaces:**
- Each image is an opaque, original, local PNG asset whose name matches `WORLD_ART` exactly.
- Images are used as background layers, so they contain no character, enemy, UI, marker, Chinese text, English text or logo.

- [ ] **Step 1: Obtain explicit AICodeWith parameter confirmation**

Show this exact confirmation and wait for approval before creating any image task:

```text
请确认本次场景生图参数：
- 模型：gpt-image-2
- 比例：台子 3:2、保安处 3:2、失序大厅 5:3、回声走廊 2:1、犬神办公室 5:3
- 数量：每个区域 1 张，共 5 张
- 质量：high
- 分辨率：4K

确认后我再开始生成。
```

- [ ] **Step 2: Generate one image per region with UTF-8 API payloads**

For every request, use `model: gpt-image-2`, `n: 1`, `quality: high`, `resolution: 4K`, `background: auto`, and the specified ratio. Create UTF-8 JSON in code with `ensure_ascii=False`; do not inline a non-ASCII prompt in a shell command and do not print the API key.

All prompts start with this shared direction:

```text
Original realistic dark 2.5D top-down action RPG environment background, viewed from a high three-quarter angle. A cursed old Chinese residential community at night: weathered concrete, barred windows, rusted metal, rain-wet ground, utility pipes, broken balconies, a few warm apartment lights, restrained black-red supernatural corruption, cold blue-green shadows, cinematic but gameplay-readable. No people, no enemies, no creatures, no vehicles, no UI, no symbols, no logo, no letters, no words, no numbers, no text, no interface, no copyright characters.
```

Append these exact scene directions:

```text
Platform: a broad central residential courtyard with a cracked stone sealing dais in the center, nine visibly different aging apartment towers surrounding it, open pedestrian routes from the dais to every tower, a ruined guard gate at lower left, an ominous apartment entrance and elevator lobby at lower center, a derelict property kiosk, a small repair shed, puddles and subtle corrupted cracks. Preserve generous clear walkways across the full frame.

Security: a compact residential-property security office and gated community entrance, guard booth, bent boom barrier, rusted iron gate, surveillance wall, wet concrete, red emergency lamps, taped-off rectangular training yard with a clear open center and perimeter walls. Preserve clear movement space inside the yard.

Lobby: the interior lobby of a cursed old apartment building, broken beige tiles, tenant mailboxes, property bulletin board with no legible writing, ruined potted plants, damaged access-control gate, stalled elevator, leaking pipes, scattered debris, clear broad path from left entrance to right exit.

Corridor: a long residential interior corridor with repeating apartment doors, broken emergency lights, exposed pipes, damp stained walls, elevator alcoves, black-red corruption creeping from floor cracks, a clear continuous path from left to right with side spaces for combat.

Property office: a large corrupted property-management office in Building 2, overturned desks, dark monitor wall with blank screens, filing cabinets, scattered papers with no readable text, warped access-control door, black-red corruption radiating around an open central boss arena, clear entry at left and broad empty arena on the right.
```

- [ ] **Step 3: Download and inspect each completed asset**

Download each returned URL with the authorization header into `/tmp/` first, then use the local image viewer to inspect it. Reject or regenerate any image with text, people/characters, campus/office-park architecture, illegible scene layout, or an unusable obstructed main route. Copy accepted images to the five final paths. Do not require alpha; verify PNG type and a nonzero width/height with `sips`.

- [ ] **Step 4: Confirm local serving**

Run:

```bash
for asset in public/assets/world/*.png; do sips -g pixelWidth -g pixelHeight "$asset"; done
curl -I http://127.0.0.1:3100/assets/world/zhongtian-platform-cursed-community-v1.png
curl -I http://127.0.0.1:3100/assets/world/security-office-cursed-community-v1.png
curl -I http://127.0.0.1:3100/assets/world/building2-lobby-cursed-community-v1.png
curl -I http://127.0.0.1:3100/assets/world/building2-corridor-cursed-community-v1.png
curl -I http://127.0.0.1:3100/assets/world/building2-property-office-cursed-community-v1.png
```

Expected: each file is a nonempty PNG and every local URL returns `HTTP/1.1 200`.

- [ ] **Step 5: Commit**

```bash
git add public/assets/world
git commit -m "feat: add cursed community region art"
```

### Task 3: Render region art while retaining dynamic guidance and fallbacks

**Files:**
- Modify: `public/world.js:1-185`
- Modify: `test/world-art.test.mjs`

**Interfaces:**
- Consumes `drawWorldArt(ctx, regionId, width, height): boolean` from `./world-art.js`.
- Produces `drawRegion(ctx, regionId, time): void` with a full Canvas fallback whenever the background is not available.

- [ ] **Step 1: Import the art drawer and preserve existing fallback functions**

At the top of `public/world.js`, add:

```js
import { drawWorldArt } from './world-art.js';
```

Rename existing `drawPlatformRegion` to `drawPlatformFallback`, `drawSecurity` to `drawSecurityFallback`, and `drawDungeon` to `drawDungeonFallback`. Do not alter `REGIONS`, `getInteractions`, `createRegionEnemies`, `drawLamp`, or any values used by the combat loop.

- [ ] **Step 2: Add readable dynamic foreground cues**

Create these rendering helpers in `world.js`:

```js
function drawCursedGate(ctx, x, y, label, active, time) {
  const pulse = .62 + Math.sin(time * 4 + x) * .16;
  ctx.save();
  ctx.fillStyle = active ? `rgba(211,151,74,${.16 + pulse * .12})` : 'rgba(157,56,51,.13)';
  ctx.beginPath(); ctx.arc(x, y, 72 + pulse * 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = active ? `rgba(238,194,105,${.5 + pulse * .22})` : 'rgba(204,77,65,.5)';
  ctx.lineWidth = 3; ctx.strokeRect(x - 36, y - 30, 72, 60);
  ctx.fillStyle = active ? '#ead29a' : '#d78273'; ctx.font = '700 13px serif'; ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 53); ctx.restore();
}

function drawPropertyPoint(ctx, x, y, label, color, time) {
  const pulse = .72 + Math.sin(time * 3 + y) * .16;
  ctx.save(); ctx.fillStyle = `rgba(0,0,0,${.34 + pulse * .08})`;
  ctx.beginPath(); ctx.ellipse(x, y + 17, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.globalAlpha = pulse; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 23 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1; ctx.fillStyle = color; ctx.font = '700 12px serif'; ctx.textAlign = 'center';
  ctx.fillText(label, x, y - 34); ctx.restore();
}

function drawSealingDais(ctx, time) {
  ctx.save(); ctx.translate(1800, 1360); ctx.strokeStyle = 'rgba(239,201,111,.48)'; ctx.lineWidth = 2;
  for (const radius of [42, 78, 116]) { ctx.beginPath(); ctx.arc(0, 0, radius + Math.sin(time * 2 + radius) * 2, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

function drawSecuritySignals(ctx, time) {
  for (const [x, y] of [[95, 95], [1225, 95], [95, 765], [1225, 765]]) drawLamp(ctx, x, y, time, true);
  ctx.save(); ctx.strokeStyle = 'rgba(224,88,72,.35)'; ctx.setLineDash([14, 12]); ctx.lineWidth = 2;
  ctx.strokeRect(65, 65, 1190, 730); ctx.restore();
}

function drawDungeonExit(ctx, regionId, time) {
  const exit = regionId === 'building2_floor1' ? { x: 1690, y: 550 } : regionId === 'building2_floor2' ? { x: 1790, y: 490 } : null;
  if (!exit) return;
  const pulse = .7 + Math.sin(time * 4) * .18;
  ctx.save(); ctx.fillStyle = `rgba(108,219,194,${.08 + pulse * .1})`;
  ctx.beginPath(); ctx.arc(exit.x, exit.y, 57 + pulse * 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(121,231,204,${.42 + pulse * .24})`; ctx.lineWidth = 3;
  ctx.strokeRect(exit.x - 24, exit.y - 42, 48, 84); ctx.restore();
}
```

Use existing world coordinates: property NPC `(1800,1160)`, shop `(2070,1320)`, forge `(1530,1320)`, dais `(1800,1360)`, security gate `(390,2210)`, Building 2 gate `(1800,2105)`, floor exits `(1690,550)` and `(1790,490)`. These helpers must only add glows, small labels and ground effects; they must not draw wide opaque shapes over the bitmap.

- [ ] **Step 3: Select bitmap or fallback per region**

Implement the region-specific draw functions this way:

```js
function drawPlatformRegion(ctx, time) {
  if (!drawWorldArt(ctx, 'platform', 3600, 2500)) drawPlatformFallback(ctx, time);
  drawSealingDais(ctx, time);
  drawPropertyPoint(ctx, 1800, 1160, '王子毅', '#e8c16d', time);
  drawPropertyPoint(ctx, 2070, 1320, '军需', '#63c8b4', time);
  drawPropertyPoint(ctx, 1530, 1320, '锻造', '#d49c50', time);
  drawCursedGate(ctx, 390, 2210, '保安处', true, time);
  drawCursedGate(ctx, 1800, 2105, '2 号楼', true, time);
}
```

Follow the same pattern for `security`, `building2_floor1`, `building2_floor2`, and `building2_boss`, passing their exact `REGIONS[regionId].width` and `height`. For every background-loaded branch, call the appropriate dynamic helper. For a fallback branch, do not double-draw the old building rectangles or region title labels a second time.

- [ ] **Step 4: Make fallback behavior testable**

Extend `test/world-art.test.mjs` with a fake context and an `Image`-absent environment assertion:

```js
test('art drawing falls back cleanly outside the browser', () => {
  const ctx = { drawImage() { throw new Error('must not draw without a browser image'); } };
  assert.equal(drawWorldArt(ctx, 'platform', 3600, 2500), false);
});
```

Import `drawWorldArt` in the test. This proves Node test runs do not initialize or draw a browser asset.

- [ ] **Step 5: Verify code and tests**

Run:

```bash
node --check public/world.js
node --test test/world-art.test.mjs test/client-rules.test.mjs
npm test
```

Expected: syntax check passes; focused tests and the entire test suite pass.

- [ ] **Step 6: Commit**

```bash
git add public/world.js public/world-art.js test/world-art.test.mjs
git commit -m "feat: render cursed community regions"
```

### Task 4: Perform desktop/mobile visual acceptance and publish

**Files:**
- Modify only if a defect is found: `public/world.js`, `public/world-art.js`, `public/styles.css`, or a world PNG asset.

**Interfaces:**
- Consumes Task 2 region backgrounds and Task 3 dynamic render paths.
- Produces a tested `main` branch served by the existing local Node server and public tunnel.

- [ ] **Step 1: Inspect all regions in the browser**

At `http://127.0.0.1:3100`, log into an existing account and visit: platform, security, Building 2 lobby, corridor, and boss office. On the platform, confirm the 2 号楼 and 保安处 visual landmarks match their F-key interaction positions. In each dungeon, confirm the player, enemy health bars, bullets, hazard circles, exits and HUD remain legible.

- [ ] **Step 2: Test bitmap failure fallback**

In browser DevTools, block one `/assets/world/` image request and reload its region. Expected: the old Canvas fallback appears; movement, combat, enemy AI, exits and UI still work; no blank canvas or uncaught error occurs.

- [ ] **Step 3: Check responsive framing**

Inspect a desktop viewport at `1440 × 900` and a mobile viewport at `390 × 844`. Expected: HUD does not hide the player or critical exit areas, quest text remains visible, and the bottom skill dock remains inside the viewport.

- [ ] **Step 4: Publish**

Run:

```bash
git status --short
git push
git status --short --branch
```

Expected: intended changes are committed, push succeeds, and `main` has no ahead/behind marker.

- [ ] **Step 5: Hand off**

Tell the user the dark cursed-community world upgrade is live at `https://washing-apron-dipping.ngrok-free.dev`, identify the upgraded regions, and state that existing saves and current task progression were retained.
