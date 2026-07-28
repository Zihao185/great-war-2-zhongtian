async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  let payload = {};
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) {
    const error = new Error(payload.error || `请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const api = {
  health: () => request('/api/health'),
  session: () => request('/api/session'),
  register: (username, password) => request('/api/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) => request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/api/logout', { method: 'POST', body: '{}' }),
  loadSave: () => request('/api/save'),
  save: (save) => request('/api/save', { method: 'PUT', body: JSON.stringify(save) }),
  action: (action) => request('/api/action', { method: 'POST', body: JSON.stringify(action) }),
  enemyDefeat: (enemyType) => request('/api/enemy-defeat', { method: 'POST', body: JSON.stringify({ enemyType }) }),
  bossClear: () => request('/api/boss-clear', { method: 'POST', body: '{}' })
};
