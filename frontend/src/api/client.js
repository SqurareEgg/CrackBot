const BASE = '';

export function getToken() {
  return localStorage.getItem('access_token');
}

export function setToken(token) {
  localStorage.setItem('access_token', token);
}

export function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

export function setRefreshToken(token) {
  localStorage.setItem('refresh_token', token);
}

export function clearToken() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

function redirectToLogin() {
  clearToken();
  window.location.href = '/login';
}

let _refreshing = null;

async function tryRefresh() {
  // 동시에 여러 요청이 401 나도 refresh는 1번만 시도
  if (_refreshing) return _refreshing;

  _refreshing = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('no refresh token');

    const res = await fetch('/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error('refresh failed');

    setToken(json.data.access_token);
    return json.data.access_token;
  })().finally(() => { _refreshing = null; });

  return _refreshing;
}

async function request(path, options = {}, _retry = false) {
  const token = getToken();
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...options, headers });

  // 401 → 토큰 갱신 후 1회 재시도
  if (res.status === 401 && !_retry) {
    try {
      await tryRefresh();
      return request(path, options, true);
    } catch {
      redirectToLogin();
      throw new Error('세션이 만료됐습니다. 다시 로그인해주세요.');
    }
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.detail
      ? (Array.isArray(json.detail) ? json.detail[0]?.msg : json.detail)
      : '요청에 실패했습니다.';
    throw new Error(msg);
  }
  return json;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  postForm: (path, formData) =>
    request(path, { method: 'POST', body: formData }),
};
