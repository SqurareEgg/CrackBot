import { api, setToken, setRefreshToken, setUser, clearToken, getRefreshToken } from './client.js';

export async function login(email, password) {
  const res = await api.post('/v1/auth/login', { email, password });
  const { access_token, refresh_token, user } = res.data;
  setToken(access_token);
  setRefreshToken(refresh_token);
  setUser(user);
  return user;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await api.post('/v1/auth/logout', { refresh_token: refreshToken });
    }
  } finally {
    clearToken();
  }
}

export async function getMe() {
  const res = await api.get('/v1/auth/me');
  return res.data;
}
