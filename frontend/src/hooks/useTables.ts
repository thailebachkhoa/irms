import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Table } from '../types';

export function useTables() {
    const [tables, setTables] = useState<Table[]>([]);

    useEffect(() => {
        const fetchTables = () =>
            api.get<Table[]>('/tables').then(r => setTables(r.data)).catch(console.error);

        fetchTables();
        const id = setInterval(fetchTables, 3000);
        return () => clearInterval(id);
    }, []);
    return { tables };
}