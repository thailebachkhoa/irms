// frontend/src/services/analyticsApi.ts


import { api } from './api';
import type { User } from '../types';
import type { AxiosResponse } from 'axios';

export const analyticsApi = {
  getDailyRevenue: (date: string) =>
    api.get<{ date: string; total: number }>(`/analytics/revenue?date=${date}`)
      .then((r: AxiosResponse<{ date: string; total: number }>) => r.data),

  login: (username: string, password: string) =>
    api.post<{ token: string }>('/auth/login', { username, password })
      .then((r: AxiosResponse<{ token: string }>) => r.data),

  createUser: (data: { username: string; password: string; role: string }) =>
    api.post<User>('/analytics/users', data)
      .then((r: AxiosResponse<User>) => r.data),

  listUsers: () =>
    api.get<User[]>('/analytics/users')
      .then((r: AxiosResponse<User[]>) => r.data),
};