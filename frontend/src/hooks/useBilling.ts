import { useState } from 'react';
import { billingApi } from '../services/billingApi';
import type { Bill } from '../types';

export function useBilling() {
    const [bill, setBill] = useState<Bill | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchBill = async (tableId: string) => {
        setLoading(true);
        try {
            const b = await billingApi.getBillByTable(tableId);
            setBill(b);
        } finally { setLoading(false); }
    };

    const pay = async (billId: string) => {
        const paid = await billingApi.pay(billId);
        setBill(paid);
    };

    return { bill, loading, fetchBill, pay };
}