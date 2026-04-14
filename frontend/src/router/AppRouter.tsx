
// ────────────────────────────────────────────────────────────
// frontend/src/router/AppRouter.tsx
// Route guard: redirect về /login nếu chưa đăng nhập hoặc sai role
// ────────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { ServerPage } from '../pages/ServerPage';
import { KitchenPage } from '../pages/KitchenPage';
import { CasherPage } from '../pages/CasherPage';
import { ManagerPage } from '../pages/ManagerPage';
import { AdminPage } from '../pages/AdminPage';
import type { Role } from '../types';

// HOC bảo vệ route — chỉ cho vào nếu có đúng role
function Guard({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (!roles.includes(user.role)) return <Navigate to="/login" replace />;
    return children;
}

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route path="/server" element={
                    <Guard roles={['server', 'manager', 'admin']}>
                        <ServerPage />
                    </Guard>
                } />
                <Route path="/kitchen" element={
                    <Guard roles={['chef', 'manager', 'admin']}>
                        <KitchenPage />
                    </Guard>
                } />
                <Route path="/casher" element={
                    <Guard roles={['casher', 'manager', 'admin']}>
                        <CasherPage />
                    </Guard>
                } />
                <Route path="/manager" element={
                    <Guard roles={['manager', 'admin']}>
                        <ManagerPage />
                    </Guard>
                } />
                <Route path="/admin" element={
                    <Guard roles={['admin']}>
                        <AdminPage />
                    </Guard>
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
