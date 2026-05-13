// ────────────────────────────────────────────────────────────
// frontend/src/context/AuthContext.tsx
// JWT decode + lưu token + cung cấp user info toàn app
//
// FIX: dùng sessionStorage thay localStorage
//   → mỗi tab/cửa sổ có session độc lập
//   → nhiều nhân viên có thể đăng nhập cùng lúc trên các tab khác nhau
// ────────────────────────────────────────────────────────────
import React, { createContext, useContext, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { AuthPayload, Role } from '../types';

// KEY lưu token — dùng sessionStorage để cô lập theo tab
const TOKEN_KEY = 'irms_token';

function readToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
}

function saveToken(token: string) {
    sessionStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}

function decodeToken(token: string): AuthPayload | null {
    try {
        return jwtDecode<AuthPayload>(token);
    } catch {
        return null;
    }
}

type AuthCtx = {
    user: AuthPayload | null;
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
    hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(() => readToken());
    const [user, setUser] = useState<AuthPayload | null>(() => {
        const t = readToken();
        return t ? decodeToken(t) : null;
    });

    const login = (newToken: string) => {
        saveToken(newToken);
        setToken(newToken);
        setUser(decodeToken(newToken));
    };

    const logout = () => {
        clearToken();
        setToken(null);
        setUser(null);
    };

    const hasRole = (...roles: Role[]) =>
        user ? roles.includes(user.role) : false;

    return (
        <AuthContext.Provider value={{ user, token, login, logout, hasRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);