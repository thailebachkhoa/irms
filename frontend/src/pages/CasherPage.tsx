
// ────────────────────────────────────────────────────────────
// frontend/src/pages/CasherPage.tsx
// Role: casher — thanh toán hóa đơn
// ────────────────────────────────────────────────────────────
import { BillPanel } from '../components/BillPanel';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function CasherPage() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1>Thu ngân</h1>
                <button onClick={() => { logout(); navigate('/login'); }}>Đăng xuất</button>
            </div>
            <BillPanel />
        </div>
    );
}
