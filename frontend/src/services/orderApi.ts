
// ────────────────────────────────────────────────────────────
// frontend/src/services/orderApi.ts
// ────────────────────────────────────────────────────────────
import type { MenuItem, Order, CreateOrderDto } from '../types';

export const orderApi = {
    getMenu: () =>
        api.get<MenuItem[]>('/menu').then(r => r.data),

    createOrder: (dto: CreateOrderDto) =>
        api.post<Order>('/orders', dto).then(r => r.data),

    getOrdersByTable: (tableId: string) =>
        api.get<Order[]>(`/orders/table/${tableId}`).then(r => r.data),

    setMenuAvailability: (id: string, isAvailable: boolean) =>
        api.patch(`/menu/${id}/availability`, { isAvailable }).then(r => r.data),
};