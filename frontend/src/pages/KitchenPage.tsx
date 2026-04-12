
// ────────────────────────────────────────────────────────────
// frontend/src/pages/KitchenPage.tsx
// Role: chef — xem và xử lý ticket
// ────────────────────────────────────────────────────────────
import { KitchenBoard } from '../components/KitchenBoard';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function KitchenPage() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1>Bếp</h1>
                <button onClick={() => { logout(); navigate('/login'); }}>Đăng xuất</button>
            </div>
            <KitchenBoard />
        </div>
    );
}
