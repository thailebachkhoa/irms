// frontend/src/services/api.ts
// Axios instance dùng chung — gắn JWT vào mọi request

import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('irms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('irms_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);