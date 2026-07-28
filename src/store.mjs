import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { createInitialSave, sanitizeSave } from './rules.mjs';

const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${Buffer.from(derived).toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [saltHex, keyHex] = String(stored).split(':');
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createStore(dbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saves (
      account_id INTEGER PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );
  `);

  const insertAccount = db.prepare('INSERT INTO accounts(username, password_hash, created_at) VALUES (?, ?, ?)');
  const insertSave = db.prepare('INSERT INTO saves(account_id, state_json, updated_at) VALUES (?, ?, ?)');
  const findAccount = db.prepare('SELECT id, username, password_hash FROM accounts WHERE username = ?');
  const findAccountById = db.prepare('SELECT id, username FROM accounts WHERE id = ?');
  const findSave = db.prepare('SELECT state_json FROM saves WHERE account_id = ?');
  const upsertSave = db.prepare('INSERT INTO saves(account_id, state_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET state_json=excluded.state_json, updated_at=excluded.updated_at');
  const passwordForTest = db.prepare('SELECT password_hash FROM accounts WHERE id = ?');

  return {
    async createAccount(username, password) {
      const passwordHash = await hashPassword(password);
      const createdAt = new Date().toISOString();
      let result;
      try {
        result = insertAccount.run(username, passwordHash, createdAt);
      } catch (error) {
        if (String(error.message).includes('UNIQUE')) {
          const duplicate = new Error('用户名已存在');
          duplicate.code = 'DUPLICATE_USERNAME';
          throw duplicate;
        }
        throw error;
      }
      const id = Number(result.lastInsertRowid);
      const save = createInitialSave();
      insertSave.run(id, JSON.stringify(save), createdAt);
      return { id, username };
    },
    async authenticate(username, password) {
      const row = findAccount.get(username);
      if (!row || !(await verifyPassword(password, row.password_hash))) return null;
      return { id: Number(row.id), username: row.username };
    },
    getAccount(id) {
      const row = findAccountById.get(id);
      return row ? { id: Number(row.id), username: row.username } : null;
    },
    getSave(accountId) {
      const row = findSave.get(accountId);
      return sanitizeSave(row ? JSON.parse(row.state_json) : createInitialSave());
    },
    putSave(accountId, save) {
      const clean = sanitizeSave(save);
      const now = new Date().toISOString();
      clean.updatedAt = now;
      upsertSave.run(accountId, JSON.stringify(clean), now);
      return clean;
    },
    getPasswordHashForTest(accountId) {
      return passwordForTest.get(accountId)?.password_hash || '';
    },
    close() { db.close(); }
  };
}
