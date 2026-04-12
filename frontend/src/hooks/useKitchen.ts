
// ────────────────────────────────────────────────────────────
// frontend/src/hooks/useKitchen.ts
// Poll mỗi 3s — không cần WebSocket, đủ dùng cho nhà hàng nhỏ
// ────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { kitchenApi } from '../services/kitchenApi';
import type { KitchenTicket } from '../types';

export function useKitchen() {
    const [tickets, setTickets] = useState<KitchenTicket[]>([]);

    const refresh = useCallback(() => {
        kitchenApi.getActiveTickets().then(setTickets).catch(console.error);
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 3000); // poll mỗi 3 giây
        return () => clearInterval(id);
    }, [refresh]);

    const startCooking = async (id: string) => {
        await kitchenApi.startCooking(id);
        refresh(); // update UI ngay
    };

    const markDone = async (id: string) => {
        await kitchenApi.markDone(id);
        refresh();
    };

    return { tickets, startCooking, markDone, refresh };
}