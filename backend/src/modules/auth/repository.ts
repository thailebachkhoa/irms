import { Pool } from 'pg';
import type { Role } from '../../infrastructure/auth';

interface UserRow {
  id: string;
  username: string;
  role: Role;
  password: string;
}

interface User {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
}

export class AuthRepository {
  constructor(private db: Pool) {}

  async findByUsername(username: string): Promise<UserRow | null> {
    const { rows } = await this.db.query(
      `SELECT id, username, role, password FROM users WHERE username = $1`,
      [username]
    );
    return rows[0] ?? null;
  }

  async createUser(username: string, hashedPassword: string, role: Role): Promise<User> {
    const { rows } = await this.db.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, role, created_at AS "createdAt"`,
      [username, hashedPassword, role]
    );
    return rows[0];
  }

  async listUsers(): Promise<User[]> {
    const { rows } = await this.db.query(
      `SELECT id, username, role, created_at AS "createdAt" FROM users ORDER BY created_at DESC`
    );
    return rows;
  }
}
