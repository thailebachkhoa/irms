import bcrypt from 'bcryptjs';
import { AuthRepository } from './repository';
import { signToken } from '../../infrastructure/auth';
import type { Role } from '../../infrastructure/auth';

export class AuthService {
  constructor(private repo: AuthRepository) {}

  async login(username: string, password: string): Promise<string> {
    const user = await this.repo.findByUsername(username);
    if (!user) throw new Error('Invalid credentials');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error('Invalid credentials');

    return signToken({ id: user.id, role: user.role });
  }

  async createUser(data: { username: string; password: string; role: Role }) {
    const existing = await this.repo.findByUsername(data.username);
    if (existing) throw new Error(`Username "${data.username}" already exists`);

    const hashed = await bcrypt.hash(data.password, 10);
    return this.repo.createUser(data.username, hashed, data.role);
  }

  async listUsers() {
    return this.repo.listUsers();
  }
}
