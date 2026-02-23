import { Router } from 'express';
import { getAccessToken } from '../lib/iikoClient.js';

export const authRouter = Router();

/**
 * POST /api/auth/token
 * Body: { serverUrl: string, login: string, password: string }
 * serverUrl — адрес сервера iiko (например https://xxx-co.iiko.it), без слэша в конце.
 * Возвращает { token } для использования в запросах отчётов (iiko Server API).
 */
authRouter.post('/token', async (req, res) => {
  try {
    const { serverUrl, login, password } = req.body ?? {};
    if (!serverUrl || !login || !password) {
      res.status(400).json({ error: 'serverUrl, login and password required' });
      return;
    }
    const token = await getAccessToken(serverUrl, login, password);
    res.json({ token });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Auth failed';
    res.status(401).json({ error: message });
  }
});
