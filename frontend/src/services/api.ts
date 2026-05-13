// frontend/src/services/api.ts
// Axios instance dùng chung — gắn JWT vào mọi request
//
// FIX: đọc token từ sessionStorage (độc lập theo tab)
//      401 chỉ clear session của tab này, không ảnh hưởng tab khác

import axios from 'axios';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api';

const TOKEN_KEY = 'irms_token';

export const api = axios.create({ baseURL: BASE_URL });

// Gắn JWT từ sessionStorage (mỗi tab có token riêng)
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// 401: chỉ clear token của tab này rồi redirect — không ảnh hưởng tab khác
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            sessionStorage.removeItem(TOKEN_KEY);
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);