import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT from localStorage when available
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('sd_token');
    if (token) {
      config.headers.Authorization = 'Bearer ' + token;
    }
  } catch (e) {
    // ignore (SSR not expected)
  }
  return config;
});

export default api;
