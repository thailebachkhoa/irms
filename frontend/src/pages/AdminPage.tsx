import { useState } from 'react';
import { analyticsApi } from '../services/analyticsApi';
import { Layout } from '../components/Layout';
import type { Role } from '../types';

const ROLES: Role[] = ['server', 'chef', 'casher', 'manager', 'admin'];

export function AdminPage() {
    const [form, setForm] = useState({ username: '', password: '', role: 'server' as Role });
    const [message, setMessage] = useState('');

    const submit = async () => {
        try {
            await analyticsApi.createUser(form);
            setMessage(`Đã tạo tài khoản "${form.username}" (${form.role})`);
            setForm({ username: '', password: '', role: 'server' });
        } catch (e: any) { setMessage(`Lỗi: ${e.message}`); }
    };

    return (
        <Layout title="Admin">
            <h2 style={{ marginBottom: 16, fontSize: 18 }}>Tạo tài khoản</h2>

            {(['username', 'password'] as const).map(field => (
                <input key={field}
                    type={field === 'password' ? 'password' : 'text'}
                    placeholder={field === 'username' ? 'Tên đăng nhập' : 'Mật khẩu'}
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{
                        display: 'block', width: '100%', padding: 10, marginBottom: 12,
                        borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box',
                        maxWidth: 400,
                    }}
                />
            ))}

            <select value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                style={{
                    width: '100%', maxWidth: 400, padding: 10, marginBottom: 16,
                    borderRadius: 6, border: '1px solid #ddd'
                }}
            >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <button onClick={submit}
                style={{
                    display: 'block', width: '100%', maxWidth: 400, padding: 12, background: '#2c3e50',
                    color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 16, cursor: 'pointer'
                }}
            >
                Tạo tài khoản
            </button>

            {message && (
                <div style={{
                    marginTop: 12, padding: 12, background: '#f0f9f4',
                    borderRadius: 6, fontSize: 14, color: '#27ae60', maxWidth: 400,
                }}>
                    {message}
                </div>
            )}
        </Layout>
    );
}