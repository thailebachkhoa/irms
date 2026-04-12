
// ────────────────────────────────────────────────────────────
// frontend/src/pages/ServerPage.tsx
// Role: server — tạo đơn + xem sơ đồ bàn
// ────────────────────────────────────────────────────────────
import { useState } from 'react';
import { OrderForm } from '../components/OrderForm';
import { TableMap } from '../components/TableMap';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function ServerPage() {
    const [tab, setTab] = useState<'order' | 'tables'>('order');
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1>Phục vụ</h1>
                <button onClick={handleLogout} style={{ padding: '6px 12px', cursor: 'pointer' }}>
                    Đăng xuất
                </button>
            </div>

            {/* Tab navigation */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {(['order', 'tables'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        style={{
                            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: tab === t ? '#2c3e50' : '#eee',
                            color: tab === t ? '#fff' : '#333', fontWeight: tab === t ? 500 : 400
                        }}
                    >
                        {t === 'order' ? 'Tạo đơn' : 'Sơ đồ bàn'}
                    </button>
                ))}
            </div>

            {tab === 'order' && <OrderForm />}
            {tab === 'tables' && <TableMap />}
        </div>
    );
}