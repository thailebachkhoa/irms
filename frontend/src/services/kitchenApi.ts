
// ────────────────────────────────────────────────────────────
// frontend/src/services/kitchenApi.ts
// ────────────────────────────────────────────────────────────
import type { KitchenTicket } from '../types';

export const kitchenApi = {
    getActiveTickets: () =>
        api.get<KitchenTicket[]>('/kitchen/tickets').then(r => r.data),

    startCooking: (id: string) =>
        api.patch(`/kitchen/${id}/start`).then(r => r.data),

    markDone: (id: string) =>
        api.patch<KitchenTicket>(`/kitchen/${id}/done`).then(r => r.data),
};