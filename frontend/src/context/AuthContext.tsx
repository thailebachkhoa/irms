import React, { createContext, useContext, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { AuthPayload, Role } from '../types';

type AuthCtx = {
    user: AuthPayload | null;
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
    hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(
        () => localStorage.getItem('irms_token')
    );
    const [user, setUser] = useState<AuthPayload | null>(() => {
        const t = localStorage.getItem('irms_token');
        return t ? jwtDecode<AuthPayload>(t) : null;
    });

    const login = (newToken: string) => {
        localStorage.setItem('irms_token', newToken);
        setToken(newToken);
        setUser(jwtDecode<AuthPayload>(newToken));
    };

    const logout = () => {
        localStorage.removeItem('irms_token');
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
