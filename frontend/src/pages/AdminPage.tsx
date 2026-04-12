
// ────────────────────────────────────────────────────────────
// frontend/src/pages/AdminPage.tsx
// Role: admin — tạo tài khoản và phân quyền
// ────────────────────────────────────────────────────────────
import { useState } from 'react';
import { analyticsApi } from '../services/analyticsApi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Role } from '../types';

const ROLES: Role[] = ['server', 'chef', 'casher', 'manager', 'admin'];

export function AdminPage() {
    const [form, setForm] = useState({ username: '', password: '', role: 'server' as Role });
    const [message, setMessage] = useState('');
    const { logout } = useAuth();
    const navigate = useNavigate();

    const submit = async () => {
        try {
            await analyticsApi.createUser(form);
            setMessage(`Đã tạo tài khoản "${form.username}" (${form.role})`);
            setForm({ username: '', password: '', role: 'server' });
        } catch (e: any) { setMessage(`Lỗi: ${e.message}`); }
    };

    return (
        <div style={{ padding: 24, maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1>Admin</h1>
                <button onClick={() => { logout(); navigate('/login'); }}>Đăng xuất</button>
            </div>

            <h2 style={{ marginBottom: 16, fontSize: 18 }}>Tạo tài khoản</h2>

            {(['username', 'password'] as const).map(field => (
                <input key={field}
                    type={field === 'password' ? 'password' : 'text'}
                    placeholder={field === 'username' ? 'Tên đăng nhập' : 'Mật khẩu'}
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{
                        display: 'block', width: '100%', padding: 10, marginBottom: 12,
                        borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box'
                    }}
                />
            ))}

            <select value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                style={{
                    width: '100%', padding: 10, marginBottom: 16,
                    borderRadius: 6, border: '1px solid #ddd'
                }}
            >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <button onClick={submit}
                style={{
                    width: '100%', padding: 12, background: '#2c3e50',
                    color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 16, cursor: 'pointer'
                }}
            >
                Tạo tài khoản
            </button>

            {message && (
                <div style={{
                    marginTop: 12, padding: 12, background: '#f0f9f4',
                    borderRadius: 6, fontSize: 14, color: '#27ae60'
                }}>
                    {message}
                </div>
            )}
        </div>
    );
}