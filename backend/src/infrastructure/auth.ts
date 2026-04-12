// src/infrastructure/auth.ts
// JWT middleware + helper sign/verify

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'admin' | 'manager' | 'server' | 'chef' | 'casher';

export interface AuthPayload {
  id: string;
  role: Role;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const SECRET = process.env.JWT_SECRET || 'irms_super_secret_key_change_in_production';
const EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, SECRET) as AuthPayload;
}

// Middleware: xác thực JWT
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware factory: kiểm tra role
export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
