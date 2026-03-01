import { Router, type Request, type Response } from 'express';

const home = Router();

home.get('/', (_req: Request, res: Response) => {
  res.json({ ok: true, message: 'iiko Reports API' });
});

home.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

export default home;
