import api from './api';

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  if (res.data && res.data.token) {
    localStorage.setItem('sd_token', res.data.token);
  }
  return res.data;
}

export async function register(name, email, password) {
  const res = await api.post('/auth/register', { name, email, password });
  if (res.data && res.data.token) {
    localStorage.setItem('sd_token', res.data.token);
  }
  return res.data;
}

export async function me() {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function updateProfile(profile) {
  const res = await api.put('/auth/profile', profile);
  return res.data;
}
