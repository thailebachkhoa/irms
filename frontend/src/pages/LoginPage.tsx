import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../services/analyticsApi';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';
import type { AuthPayload } from '../types';

const ROLE_ROUTES: Record<string, string> = {
    server: '/server',
    chef: '/kitchen',
    casher: '/casher',
    manager: '/manager',
    admin: '/admin',
};

export function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const submit = async () => {
        try {
            const { token } = await analyticsApi.login(username, password);
            const decoded = jwtDecode<AuthPayload>(token);
            login(token);
            navigate(ROLE_ROUTES[decoded.role] ?? '/login');
        } catch {
            setError('Sai tên đăng nhập hoặc mật khẩu');
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: '#f5f5f5'
        }}>
            <div style={{
                padding: 32, background: '#fff', borderRadius: 12,
                width: 320, boxShadow: '0 2px 12px rgba(0,0,0,.08)'
            }}>
                <h2 style={{ marginBottom: 24, textAlign: 'center' }}>IRMS</h2>

                <input placeholder="Tên đăng nhập" value={username}
                    onChange={e => setUsername(e.target.value)}
                    style={{
                        width: '100%', padding: 10, marginBottom: 12,
                        borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box'
                    }}
                />
                <input type="password" placeholder="Mật khẩu" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    style={{
                        width: '100%', padding: 10, marginBottom: 16,
                        borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box'
                    }}
                />

                {error && <div style={{ color: '#e74c3c', marginBottom: 12, fontSize: 14 }}>{error}</div>}

                <button onClick={submit}
                    style={{
                        width: '100%', padding: 12, background: '#2c3e50',
                        color: '#fff', border: 'none', borderRadius: 8,
                        fontSize: 16, cursor: 'pointer'
                    }}
                >
                    Đăng nhập
                </button>
            </div>
        </div>
    );
}