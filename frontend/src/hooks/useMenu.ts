import { useState, useEffect } from 'react';
import { orderApi } from '../services/orderApi';
import type { MenuItem } from '../types';

export function useMenu() {
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        orderApi.getMenu()
            .then(setMenu)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    return { menu, loading, error };
}
