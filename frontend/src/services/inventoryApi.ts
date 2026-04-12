
// ────────────────────────────────────────────────────────────
// frontend/src/services/inventoryApi.ts
// ────────────────────────────────────────────────────────────
import type { Ingredient } from '../types';

export const inventoryApi = {
    getAll: () =>
        api.get<Ingredient[]>('/inventory').then(r => r.data),

    updateQuantity: (name: string, quantity: number) =>
        api.patch(`/inventory/${name}`, { quantity }).then(r => r.data),
};