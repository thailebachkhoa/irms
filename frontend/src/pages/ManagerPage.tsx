
// ────────────────────────────────────────────────────────────
// frontend/src/pages/ManagerPage.tsx
// Role: manager — bàn + kho + doanh thu (3 tab)
// ────────────────────────────────────────────────────────────
import { useState } from 'react';
import { TableMap } from '../components/TableMap';
import { RevenueChart } from '../components/RevenueChart';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../services/inventoryApi';
import { useEffect } from 'react';
import type { Ingredient } from '../types';

export function ManagerPage() {
    const [tab, setTab] = useState<'tables' | 'inventory' | 'revenue'>('tables');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (tab === 'inventory')
            inventoryApi.getAll().then(setIngredients).catch(console.error);
    }, [tab]);

    return (
        <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1>Quản lý</h1>
                <button onClick={() => { logout(); navigate('/login'); }}>Đăng xuất</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {(['tables', 'inventory', 'revenue'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        style={{
                            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: tab === t ? '#2c3e50' : '#eee',
                            color: tab === t ? '#fff' : '#333'
                        }}
                    >
                        {t === 'tables' ? 'Sơ đồ bàn' : t === 'inventory' ? 'Kho nguyên liệu' : 'Doanh thu'}
                    </button>
                ))}
            </div>

            {tab === 'tables' && <TableMap />}
            {tab === 'revenue' && <RevenueChart />}
            {tab === 'inventory' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                            {['Nguyên liệu', 'Số lượng', 'Đơn vị', 'Ngưỡng cảnh báo', 'Cập nhật'].map(h => (
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ingredients.map(item => (
                            <tr key={item.id}
                                style={{
                                    borderTop: '1px solid #eee',
                                    background: Number(item.quantity) <= Number(item.threshold)
                                        ? '#fff3f3' : 'transparent'
                                }}>
                                <td style={{ padding: '8px 12px' }}>{item.name}</td>
                                <td style={{
                                    padding: '8px 12px',
                                    color: Number(item.quantity) <= Number(item.threshold)
                                        ? '#e74c3c' : 'inherit',
                                    fontWeight: Number(item.quantity) <= Number(item.threshold)
                                        ? 500 : 400
                                }}>
                                    {item.quantity}
                                    {Number(item.quantity) <= Number(item.threshold)
                                        && (
                                            <span style={{ marginLeft: 6, fontSize: 12, color: '#e74c3c' }}>
                                                ⚠ Sắp hết
                                            </span>
                                        )}
                                </td>
                                <td style={{ padding: '8px 12px' }}>{item.unit}</td>
                                <td style={{ padding: '8px 12px', color: '#999' }}>{item.threshold}</td>

                                {/* ── Cột cập nhật ── */}
                                <td style={{ padding: '8px 12px' }}>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <input
                                            type="number"
                                            min={0}
                                            defaultValue={item.quantity}
                                            id={`qty-${item.name}`}
                                            style={{
                                                width: 80, padding: '4px 8px',
                                                borderRadius: 6, border: '1px solid #ddd'
                                            }}
                                        />
                                        <button
                                            onClick={async () => {
                                                const input = document.getElementById(`qty-${item.name}`) as HTMLInputElement;
                                                const newQty = parseFloat(input.value);
                                                if (isNaN(newQty) || newQty < 0) return;
                                                try {
                                                    await inventoryApi.updateQuantity(item.name, newQty);
                                                    // Cập nhật lại list
                                                    setIngredients(prev =>
                                                        prev.map(i => i.name === item.name
                                                            ? { ...i, quantity: newQty }
                                                            : i
                                                        )
                                                    );
                                                } catch (e) { console.error(e); }
                                            }}
                                            style={{
                                                padding: '4px 10px', background: '#2c3e50',
                                                color: '#fff', border: 'none',
                                                borderRadius: 6, cursor: 'pointer', fontSize: 13
                                            }}
                                        >
                                            Lưu
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
