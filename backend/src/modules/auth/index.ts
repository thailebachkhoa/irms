import { Router } from 'express';
import { Pool } from 'pg';
import { AuthRepository } from './repository';
import { AuthService } from './service';
import { createAuthRoutes } from './routes';

export function registerAuthModule(db: Pool): Router {
  const repo = new AuthRepository(db);
  const service = new AuthService(repo);
  return createAuthRoutes(service);
}
