# 游戏资源加载性能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make save-resume fast after the initial visit by shipping compressed versioned assets, caching them in the browser, and prefetching them before the user opens a save.

**Architecture:** Convert all runtime world and Yang Zihao animation images to versioned WebP files. Update the static server to cache only `assets/*-vN.*` files immutably, change runtime imports to the new paths, and begin `preloadWorldArt()` during initial page boot; `startGame` remains the final readiness gate and its Canvas fallback is unchanged.

**Tech Stack:** Node.js built-in HTTP server/test runner, browser `Image`, Canvas 2D, ImageMagick WebP encoder.

## Global Constraints

- Preserve the existing save, combat, region, interaction and fallback behavior.
- Keep all generated source art local; no third-party runtime image URL.
- Use `-v2.webp` names for newly encoded runtime resources so immutable caching cannot serve stale `-v1` art.
- Keep static HTML, CSS, JavaScript and API responses non-immutable; only versioned `assets/` images receive one-year immutable caching.
- Preserve alpha for character sprites and keep scene backgrounds opaque.

---

### Task 1: Add WebP MIME and versioned-asset cache policy

**Files:**
- Modify: `src/http.mjs:7-10`
- Modify: `src/http.mjs:151-154`
- Modify: `test/api.test.mjs:9-65`

**Interfaces:**
- `createHttpServer()` serves `.webp` as `image/webp`.
- Versioned static images matching `assets/...-v<integer>.(webp|png|jpg)` have `cache-control: public, max-age=31536000, immutable`.
- Every other static file retains `cache-control: no-cache`.

- [ ] **Step 1: Write failing cache assertions**

Append to `test/api.test.mjs` inside the existing HTTP server test, after the account assertions:

```js
const versionedAsset = await fetch(`${base}/assets/world/zhongtian-platform-cursed-community-v2.webp`);
assert.equal(versionedAsset.status, 200);
assert.equal(versionedAsset.headers.get('content-type'), 'image/webp');
assert.equal(versionedAsset.headers.get('cache-control'), 'public, max-age=31536000, immutable');

const script = await fetch(`${base}/game.js`);
assert.equal(script.status, 200);
assert.equal(script.headers.get('cache-control'), 'no-cache');
```

- [ ] **Step 2: Run the targeted test and observe failure**

Run: `node --test test/api.test.mjs`

Expected: FAIL because the v2 WebP does not exist and `.webp` has no MIME entry.

- [ ] **Step 3: Implement MIME and cache policy**

In `src/http.mjs`, add `'.webp': 'image/webp'` to `MIME`. Before `res.writeHead` in the static branch, add:

```js
const immutableAsset = relative.startsWith('assets/') && /-v\d+\.(webp|png|jpe?g)$/i.test(relative);
const cacheControl = immutableAsset ? 'public, max-age=31536000, immutable' : 'no-cache';
```

Use `cacheControl` for the static response header.

- [ ] **Step 4: Commit**

```bash
git add src/http.mjs test/api.test.mjs
git commit -m "feat: cache versioned game assets"
```

### Task 2: Encode runtime art as versioned WebP

**Files:**
- Create: `public/assets/world/zhongtian-platform-cursed-community-v2.webp`
- Create: `public/assets/world/security-office-cursed-community-v2.webp`
- Create: `public/assets/world/building2-lobby-cursed-community-v2.webp`
- Create: `public/assets/world/building2-corridor-cursed-community-v2.webp`
- Create: `public/assets/world/building2-property-office-cursed-community-v2.webp`
- Create: `public/assets/characters/yang-zihao-run-sprites-v2.webp`
- Create: `public/assets/characters/yang-zihao-slash-sprites-v2.webp`
- Create: `public/assets/characters/yang-zihao-skill-sprites-v2.webp`
- Create: `public/assets/characters/yang-zihao-aura-sprites-v2.webp`

**Interfaces:**
- World files remain at most 2048px on their longest side; character sheets remain at most 1536px on their longest side.
- All files are valid WebP; the four character sheets retain alpha.

- [ ] **Step 1: Encode with ImageMagick**

Run the following commands after Task 1 creates the target directory names:

```bash
magick public/assets/world/zhongtian-platform-cursed-community-v1.png -resize '2048x2048>' -strip -quality 78 -define webp:method=6 public/assets/world/zhongtian-platform-cursed-community-v2.webp
magick public/assets/world/security-office-cursed-community-v1.png -resize '2048x2048>' -strip -quality 78 -define webp:method=6 public/assets/world/security-office-cursed-community-v2.webp
magick public/assets/world/building2-lobby-cursed-community-v1.png -resize '2048x2048>' -strip -quality 78 -define webp:method=6 public/assets/world/building2-lobby-cursed-community-v2.webp
magick public/assets/world/building2-corridor-cursed-community-v1.png -resize '2048x2048>' -strip -quality 78 -define webp:method=6 public/assets/world/building2-corridor-cursed-community-v2.webp
magick public/assets/world/building2-property-office-cursed-community-v1.png -resize '2048x2048>' -strip -quality 78 -define webp:method=6 public/assets/world/building2-property-office-cursed-community-v2.webp
magick public/assets/characters/yang-zihao-run-sprites-v1.png -resize '1536x1536>' -strip -quality 80 -define webp:method=6 public/assets/characters/yang-zihao-run-sprites-v2.webp
magick public/assets/characters/yang-zihao-slash-sprites-v1.png -resize '1536x1536>' -strip -quality 80 -define webp:method=6 public/assets/characters/yang-zihao-slash-sprites-v2.webp
magick public/assets/characters/yang-zihao-skill-sprites-v1.png -resize '1536x1536>' -strip -quality 80 -define webp:method=6 public/assets/characters/yang-zihao-skill-sprites-v2.webp
magick public/assets/characters/yang-zihao-aura-sprites-v1.png -resize '1536x1536>' -strip -quality 80 -define webp:method=6 public/assets/characters/yang-zihao-aura-sprites-v2.webp
```

- [ ] **Step 2: Verify type, dimensions, alpha and total transfer size**

Run:

```bash
identify public/assets/world/*-v2.webp public/assets/characters/*-v2.webp
magick public/assets/characters/yang-zihao-run-sprites-v2.webp -alpha extract -format '%[min]\n' info:
magick public/assets/characters/yang-zihao-slash-sprites-v2.webp -alpha extract -format '%[min]\n' info:
magick public/assets/characters/yang-zihao-skill-sprites-v2.webp -alpha extract -format '%[min]\n' info:
magick public/assets/characters/yang-zihao-aura-sprites-v2.webp -alpha extract -format '%[min]\n' info:
du -ch public/assets/world/*-v2.webp public/assets/characters/*-v2.webp | tail -1
```

Expected: each file reports `WEBP`; every character alpha minimum is `0`; total runtime transfer is materially below the current PNG set.

- [ ] **Step 3: Commit**

```bash
git add public/assets/world/*-v2.webp public/assets/characters/*-v2.webp
git commit -m "perf: compress runtime art as webp"
```

### Task 3: Switch sources and prefetch world art during page boot

**Files:**
- Modify: `public/world-art.js:2-6`
- Modify: `public/game.js:10-18`
- Modify: `public/game.js:500-502`
- Modify: `test/world-art.test.mjs:7-12`

**Interfaces:**
- `WORLD_ART` source paths use the five `-v2.webp` files.
- The four `Image` objects in `game.js` use `-v2.webp` paths.
- `preloadWorldArt()` is invoked immediately after initial UI setup and caught locally so a network error does not create an unhandled rejection.

- [ ] **Step 1: Update the failing definition assertions**

In `test/world-art.test.mjs`, replace the asset assertion with:

```js
assert.match(entry.src, /-v2\.webp$/);
```

- [ ] **Step 2: Switch all source strings**

Replace the five `WORLD_ART` URLs with `-v2.webp`. Replace the four player sprite `src` values with their `-v2.webp` counterparts. Keep portrait `yang-zihao-imperial-knight-v1.jpg` unchanged because it belongs to the hero-selection CSS, not the running game asset gate.

- [ ] **Step 3: Start background prefetch on boot**

At the bottom of `public/game.js`, replace:

```js
setAuthMode('login');checkServer();
```

with:

```js
setAuthMode('login');
checkServer();
preloadWorldArt().catch(() => {});
```

`startGame` continues to call `preloadGameAssets()` as the readiness check, which resolves immediately after cache/preload completion.

- [ ] **Step 4: Verify cache behavior and application tests**

Run:

```bash
node --check public/game.js
node --check public/world-art.js
node --test test/api.test.mjs test/world-art.test.mjs
npm test
curl -I http://127.0.0.1:3100/assets/world/zhongtian-platform-cursed-community-v2.webp
curl -I http://127.0.0.1:3100/game.js
```

Expected: tests pass; the WebP header is `image/webp` plus the immutable cache policy; `game.js` remains `no-cache`.

- [ ] **Step 5: Commit and publish**

```bash
git add public/world-art.js public/game.js test/world-art.test.mjs
git commit -m "perf: prefetch cached game art before resume"
git push
git status --short --branch
```
