
// ────────────────────────────────────────────────────────────
// frontend/src/services/api.ts
// Axios instance dùng chung — gắn JWT vào mọi request
// ────────────────────────────────────────────────────────────
import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Interceptor: tự động gắn token vào header trước mỗi request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('irms_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Interceptor: nếu 401 → token hết hạn → về trang login
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
