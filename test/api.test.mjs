import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createStore } from '../src/store.mjs';
import { createHttpServer } from '../src/http.mjs';

test('HTTP API registers, authenticates, isolates saves, and validates economy actions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zhongtian-api-'));
  const store = createStore(join(dir, 'api.db'));
  const server = createHttpServer({ store, staticDir: resolve('public'), random: () => 0.5 });
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  const base = `http://127.0.0.1:${server.address().port}`;

  async function request(path, { method = 'GET', body, cookie } = {}) {
    return fetch(`${base}${path}`, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  }

  try {
    const registered = await request('/api/register', { method: 'POST', body: { username: 'hero_01', password: 'secure-pass-01' } });
    assert.equal(registered.status, 201);
    const cookie = registered.headers.get('set-cookie').split(';')[0];
    assert.match(cookie, /^gw2_session=/);

    const duplicate = await request('/api/register', { method: 'POST', body: { username: 'hero_01', password: 'secure-pass-02' } });
    assert.equal(duplicate.status, 409);
    const wrong = await request('/api/login', { method: 'POST', body: { username: 'hero_01', password: 'wrong-pass' } });
    assert.equal(wrong.status, 401);

    let saved = await request('/api/save', { method: 'PUT', cookie, body: { hero: 'yang_zihao', quest: 'security_active', region: 'security', checkpoint: 'security_entry', health: 91 } });
    assert.equal(saved.status, 200);
    saved = await request('/api/save', { method: 'PUT', cookie, body: { quest: 'security_complete', health: 91 } });
    assert.equal(saved.status, 200);
    const sword = await request('/api/action', { method: 'POST', cookie, body: { type: 'award_sword' } });
    assert.equal(sword.status, 200);
    assert.ok((await sword.json()).save.inventory.includes('imperial_sword'));
    await request('/api/save', { method: 'PUT', cookie, body: { quest: 'building2_active', region: 'building2_boss', checkpoint: 'boss_entry' } });
    for (let index = 0; index < 3; index++) assert.equal((await request('/api/boss-clear', { method: 'POST', cookie, body: {} })).status, 200);
    const rejectedWeapon = await request('/api/action', { method: 'POST', cookie, body: { type: 'buy_item', itemId: 'guard_broadsword' } });
    assert.equal(rejectedWeapon.status, 400);
    const purchase = await request('/api/action', { method: 'POST', cookie, body: { type: 'buy_item', itemId: 'guard_armor' } });
    assert.equal(purchase.status, 200);
    assert.ok((await purchase.json()).save.inventory.includes('guard_armor'));

    const second = await request('/api/register', { method: 'POST', body: { username: 'hero_02', password: 'secure-pass-02' } });
    const secondCookie = second.headers.get('set-cookie').split(';')[0];
    const secondSave = await request('/api/save', { cookie: secondCookie });
    assert.equal((await secondSave.json()).save.gold, 0);

    const page = await request('/');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /中天争霸/);

    const versionedAsset = await request('/assets/characters/yang-zihao-emperor-sword-v1.png');
    assert.equal(versionedAsset.status, 200);
    assert.equal(versionedAsset.headers.get('content-type'), 'image/png');
    assert.equal(versionedAsset.headers.get('cache-control'), 'public, max-age=31536000, immutable');

    const script = await request('/game.js');
    assert.equal(script.status, 200);
    assert.equal(script.headers.get('cache-control'), 'no-cache');
  } finally {
    await new Promise(resolveClose => server.close(resolveClose));
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
