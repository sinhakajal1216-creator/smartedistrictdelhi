import axios from 'axios';

// In development, Vite proxies this relative path to the Express server.
// Deployments can override it with VITE_API_BASE.
const baseURL = import.meta.env.VITE_API_BASE || '/api';

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
