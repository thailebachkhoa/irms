
// ────────────────────────────────────────────────────────────
// frontend/src/services/billingApi.ts
// ────────────────────────────────────────────────────────────
import type { Bill } from '../types';

export const billingApi = {
    getBillByTable: (tableId: string) =>
        api.get<Bill>(`/billing/${tableId}`).then(r => r.data),

    pay: (billId: string) =>
        api.post<Bill>(`/billing/${billId}/pay`).then(r => r.data),
};
