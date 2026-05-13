
// ────────────────────────────────────────────────────────────
// frontend/src/components/OrderForm.tsx
// Form tạo đơn: chọn combo (từ MenuGrid) → nhập số bàn + ghi chú → submit
// ────────────────────────────────────────────────────────────
import { useState } from 'react';
import { orderApi } from '../services/orderApi';
import { MenuGrid } from './MenuGrid';
import { useMenu } from '../hooks/useMenu';
import type { MenuItem, CreateOrderDto } from '../types';

export function OrderForm() {
    const { menu, loading } = useMenu();
    const [selected, setSelected] = useState<MenuItem | null>(null);
    const [tableId, setTableId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const submit = async () => {
        if (!selected || !tableId) return;
        setStatus('loading');
        try {
            const dto: CreateOrderDto = {
                tableId, comboId: selected.id, quantity, notes,
            };
            await orderApi.createOrder(dto);
            setStatus('success');
            // reset form
            setSelected(null); setTableId(''); setQuantity(1); setNotes('');
            setTimeout(() => setStatus('idle'), 2000);
        } catch { setStatus('idle'); }
    };

    if (loading) return <div>Đang tải menu...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MenuGrid menu={menu} onSelect={setSelected} />

            {selected && (
                <div style={{ padding: 12, background: '#f0f9f4', borderRadius: 8 }}>
                    <strong>Đã chọn:</strong> {selected.name} —{' '}
                    {selected.price.toLocaleString('vi-VN')} đ
                </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
                <select
                    value={tableId}
                    onChange={e => setTableId(e.target.value)}
                    style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                >
                    <option value="">-- Chọn bàn --</option>
                    {Array.from({ length: 20 }, (_, i) =>
                        String(i + 1).padStart(3, '0')
                    ).map(n => (
                        <option key={n} value={n}>Bàn {n}</option>
                    ))}
                </select>
                <input
                    type="number" min={1} value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    style={{ width: 70, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                />
            </div>

            <textarea
                placeholder="Ghi chú (không cay, dị ứng...)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
            />

            <button
                onClick={submit}
                disabled={!selected || !tableId || status === 'loading'}
                style={{
                    padding: '10px 24px', borderRadius: 8, border: 'none',
                    background: status === 'success' ? '#27ae60' : '#2c3e50',
                    color: '#fff', cursor: 'pointer', fontWeight: 500,
                }}
            >
                {status === 'loading' ? 'Đang gửi...' :
                    status === 'success' ? 'Đã tạo đơn!' : 'Tạo đơn'}
            </button>
        </div>
    );
}