import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createStore } from '../src/store.mjs';

test('accounts use password hashes and isolated saves', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zhongtian-store-'));
  const store = createStore(join(dir, 'test.db'));
  try {
    const first = await store.createAccount('hero_one', 'secure-pass-01');
    const second = await store.createAccount('hero_two', 'secure-pass-02');
    assert.equal(await store.authenticate('hero_one', 'wrong-pass'), null);
    assert.equal((await store.authenticate('hero_one', 'secure-pass-01')).id, first.id);
    const save = store.getSave(first.id);
    save.gold = 180;
    store.putSave(first.id, save);
    assert.equal(store.getSave(first.id).gold, 180);
    assert.equal(store.getSave(second.id).gold, 0);
    assert.doesNotMatch(store.getPasswordHashForTest(first.id), /secure-pass-01/);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
