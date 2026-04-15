import { useState, useEffect } from 'react';
import { analyticsApi } from '../services/analyticsApi';

export function RevenueChart() {
    const today = new Date().toISOString().slice(0, 10);
    const [total, setTotal] = useState<number | null>(null);
    const [date, setDate] = useState(today);

    useEffect(() => {
        analyticsApi.getDailyRevenue(date)
            .then(d => setTotal(d.total))
            .catch(console.error);
    }, [date]);

    return (
        <div style={{ padding: 24, border: '1px solid #ddd', borderRadius: 12, maxWidth: 360 }}>
            <div style={{ marginBottom: 12, fontSize: 14, color: '#666' }}>Doanh thu ngày</div>
            <input
                type="date" value={date}
                onChange={e => setDate(e.target.value)}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', marginBottom: 16 }}
            />
            <div style={{ fontSize: 36, fontWeight: 700, color: '#2c3e50' }}>
                {total === null ? '...' : `${total.toLocaleString('vi-VN')} đ`}
            </div>
        </div>
    );
}