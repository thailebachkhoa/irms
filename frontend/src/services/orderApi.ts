
import { api } from './api';
import type { MenuItem, Order, CreateOrderDto } from '../types';
import type { AxiosResponse } from 'axios';

export const orderApi = {
  getMenu: () =>
    api.get<MenuItem[]>('/menu')
      .then((r: AxiosResponse<MenuItem[]>) => r.data),

  createOrder: (dto: CreateOrderDto) =>
    api.post<Order>('/orders', dto)
      .then((r: AxiosResponse<Order>) => r.data),

  getOrdersByTable: (tableId: string) =>
    api.get<Order[]>(`/orders/table/${tableId}`)
      .then((r: AxiosResponse<Order[]>) => r.data),

  setMenuAvailability: (id: string, isAvailable: boolean) =>
    api.patch(`/menu/${id}/availability`, { isAvailable })
      .then((r: AxiosResponse) => r.data),
};