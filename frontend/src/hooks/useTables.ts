

// ────────────────────────────────────────────────────────────
// frontend/src/hooks/useTables.ts
// Poll mỗi 3s — server xem sơ đồ bàn real-time
// ────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Table } from '../types';

export function useTables() {
    const [tables, setTables] = useState<Table[]>([]);

    useEffect(() => {
        const fetch = () =>
            api.get<Table[]>('/tables').then(r => setTables(r.data)).catch(console.error);

        fetch();
        const id = setInterval(fetch, 3000);
        return () => clearInterval(id);
    }, []);

    return { tables };
}