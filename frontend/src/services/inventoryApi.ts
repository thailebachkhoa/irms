
import { api } from './api';
import type { Ingredient } from '../types';
import type { AxiosResponse } from 'axios';

export const inventoryApi = {
  getAll: () =>
    api.get<Ingredient[]>('/inventory')
      .then((r: AxiosResponse<Ingredient[]>) => r.data),

  updateQuantity: (name: string, quantity: number) =>
    api.patch<Ingredient>(`/inventory/${encodeURIComponent(name)}`, { quantity })
      .then((r: AxiosResponse<Ingredient>) => r.data),
};