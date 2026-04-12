
// ────────────────────────────────────────────────────────────
// frontend/src/services/analyticsApi.ts
// ────────────────────────────────────────────────────────────
import type { User } from '../types';

export const analyticsApi = {
    getDailyRevenue: (date: string) =>
        api.get<{ date: string; total: number }>(`/analytics/revenue?date=${date}`)
            .then(r => r.data),

    login: (username: string, password: string) =>
        api.post<{ token: string }>('/auth/login', { username, password })
            .then(r => r.data),

    createUser: (data: { username: string; password: string; role: string }) =>
        api.post<User>('/analytics/users', data).then(r => r.data),
};