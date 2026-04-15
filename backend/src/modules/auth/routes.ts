import { Router, Request, Response } from 'express';
import { AuthService } from './service';
import { authenticate, authorize } from '../../infrastructure/auth';

export function createAuthRoutes(service: AuthService): Router {
  const router = Router();

  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'username and password required' });
        return;
      }
      const token = await service.login(username, password);
      res.json({ token });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });

  router.post('/analytics/users',
    authenticate, authorize('admin'),
    async (req: Request, res: Response) => {
      try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
          res.status(400).json({ error: 'username, password, role required' });
          return;
        }
        const user = await service.createUser({ username, password, role });
        res.status(201).json(user);
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  router.get('/analytics/users',
    authenticate, authorize('admin'),
    async (_req: Request, res: Response) => {
      try {
        res.json(await service.listUsers());
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  return router;
}
