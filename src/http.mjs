import { createServer as createNodeServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomBytes } from 'node:crypto';
import { applyAction, mergeProgressSave, RuleError } from './rules.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml'
};

function json(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), ...headers });
  res.end(body);
}

async function bodyJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw Object.assign(new Error('请求过大'), { status: 413 });
    chunks.push(chunk);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('JSON 格式错误'), { status: 400 }); }
}

function cookieValue(req, name) {
  const cookies = String(req.headers.cookie || '').split(';');
  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

function validateCredentials(username, password) {
  if (!/^[\p{L}\p{N}_-]{3,20}$/u.test(String(username || ''))) throw Object.assign(new Error('用户名需为 3–20 位文字、数字、下划线或短横线'), { status: 400 });
  if (typeof password !== 'string' || password.length < 8 || password.length > 64) throw Object.assign(new Error('密码需为 8–64 位'), { status: 400 });
}

export function createHttpServer({ store, staticDir, random = Math.random }) {
  const sessions = new Map();
  const loginFailures = new Map();

  function startSession(account) {
    const id = randomBytes(32).toString('hex');
    sessions.set(id, { accountId: account.id, username: account.username, expires: Date.now() + 7 * 86400000 });
    return id;
  }

  function sessionFor(req) {
    const id = cookieValue(req, 'gw2_session');
    const session = id ? sessions.get(id) : null;
    if (!session || session.expires < Date.now()) { if (id) sessions.delete(id); return null; }
    return { id, ...session };
  }

  function requireSession(req) {
    const session = sessionFor(req);
    if (!session) throw Object.assign(new Error('请先登录'), { status: 401 });
    return session;
  }

  function checkRate(req) {
    const key = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = loginFailures.get(key) || { count: 0, resetAt: now + 900000 };
    if (entry.resetAt < now) { entry.count = 0; entry.resetAt = now + 900000; }
    if (entry.count >= 5) throw Object.assign(new Error('登录失败次数过多，请稍后再试'), { status: 429 });
    return { key, entry };
  }

  return createNodeServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, service: '中天争霸', time: new Date().toISOString() });

      if (url.pathname === '/api/register' && req.method === 'POST') {
        const { username, password } = await bodyJson(req); validateCredentials(username, password);
        const account = await store.createAccount(username, password);
        const sessionId = startSession(account);
        return json(res, 201, { account, save: store.getSave(account.id) }, { 'set-cookie': `gw2_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` });
      }

      if (url.pathname === '/api/login' && req.method === 'POST') {
        const rate = checkRate(req);
        const { username, password } = await bodyJson(req); validateCredentials(username, password);
        const account = await store.authenticate(username, password);
        if (!account) { rate.entry.count += 1; loginFailures.set(rate.key, rate.entry); return json(res, 401, { error: '用户名或密码错误' }); }
        loginFailures.delete(rate.key);
        const sessionId = startSession(account);
        return json(res, 200, { account, save: store.getSave(account.id) }, { 'set-cookie': `gw2_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` });
      }

      if (url.pathname === '/api/logout' && req.method === 'POST') {
        const session = sessionFor(req); if (session) sessions.delete(session.id);
        return json(res, 200, { ok: true }, { 'set-cookie': 'gw2_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
      }

      if (url.pathname === '/api/session' && req.method === 'GET') {
        const session = sessionFor(req);
        return session ? json(res, 200, { authenticated: true, account: { id: session.accountId, username: session.username } }) : json(res, 200, { authenticated: false });
      }

      if (url.pathname === '/api/save' && req.method === 'GET') {
        const session = requireSession(req);
        return json(res, 200, { save: store.getSave(session.accountId) });
      }

      if (url.pathname === '/api/save' && req.method === 'PUT') {
        const session = requireSession(req); const incoming = await bodyJson(req);
        const save = store.putSave(session.accountId, mergeProgressSave(store.getSave(session.accountId), incoming));
        return json(res, 200, { save });
      }

      if (url.pathname === '/api/action' && req.method === 'POST') {
        const session = requireSession(req); const action = await bodyJson(req);
        if (['boss_clear', 'enemy_defeat', 'dean_failure'].includes(action.type)) throw Object.assign(new Error('该操作必须由战斗结算接口发起'), { status: 400 });
        const applied = applyAction(store.getSave(session.accountId), action);
        const save = store.putSave(session.accountId, applied.save);
        return json(res, 200, { save, result: applied.result });
      }

      if (url.pathname === '/api/enemy-defeat' && req.method === 'POST') {
        const session = requireSession(req); const { enemyType } = await bodyJson(req);
        const rewards = { hall_patrol: [4, 8], corridor_archer: [6, 11], security_echo: [5, 9], building1_guard: [5, 10], building1_archer: [7, 13], building1_wraith: [8, 14] };
        if (!rewards[enemyType]) throw Object.assign(new Error('未知敌人'), { status: 400 });
        const [min, max] = rewards[enemyType]; const amount = min + Math.floor(random() * (max - min + 1));
        const applied = applyAction(store.getSave(session.accountId), { type: 'enemy_defeat', amount });
        const save = store.putSave(session.accountId, applied.save);
        return json(res, 200, { save, result: applied.result });
      }

      if (url.pathname === '/api/boss-clear' && req.method === 'POST') {
        const session = requireSession(req); const current = store.getSave(session.accountId); const { bossId = 'zigou' } = await bodyJson(req);
        const action = { type: 'boss_clear', bossId };
        if (bossId === 'zigou') { action.armorRoll = random(); action.pearlRoll = random(); }
        if (bossId === 'youkai') action.keyRoll = random();
        if (bossId === 'dean') action.darkSwordRoll = random();
        const applied = applyAction(current, action);
        const save = store.putSave(session.accountId, applied.save);
        return json(res, 200, { save, result: applied.result });
      }

      if (url.pathname === '/api/dean-failure' && req.method === 'POST') {
        const session = requireSession(req); const applied = applyAction(store.getSave(session.accountId), { type: 'dean_failure' });
        const save = store.putSave(session.accountId, applied.save);
        return json(res, 200, { save, result: applied.result });
      }

      if (url.pathname.startsWith('/api/')) return json(res, 404, { error: '接口不存在' });

      const requestPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
      const relative = normalize(requestPath).replace(/^[/\\]+/, '');
      if (relative.includes('..')) return json(res, 403, { error: '禁止访问' });
      const filePath = join(staticDir, relative);
      const data = await readFile(filePath);
      const immutableAsset = relative.startsWith('assets/') && /-v\d+\.(webp|png|jpe?g)$/i.test(relative);
      const cacheControl = immutableAsset ? 'public, max-age=31536000, immutable' : 'no-cache';
      res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream', 'content-length': data.length, 'cache-control': cacheControl });
      res.end(data);
    } catch (error) {
      if (error?.code === 'ENOENT') return json(res, 404, { error: '页面不存在' });
      const status = error.status || (error.code === 'DUPLICATE_USERNAME' ? 409 : error instanceof RuleError ? 400 : 500);
      if (status === 500) console.error(error);
      return json(res, status, { error: status === 500 ? '服务器内部错误' : error.message });
    }
  });
}
