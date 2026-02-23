import { Router } from 'express';
import { getFilters, setFilters, type HostFilters } from '../db/store.js';

export const settingsRouter = Router();

/**
 * GET /api/settings?host=...
 * Возвращает сохранённые фильтры для хоста (адрес iiko без протокола и слэша).
 */
settingsRouter.get('/', async (req, res) => {
  try {
    const host = (req.query.host as string)?.trim();
    if (!host) {
      res.status(400).json({ error: 'host query required' });
      return;
    }
    const filters = await getFilters(host);
    res.json(filters ?? {});
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to get settings';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/settings
 * Body: { host: string, filters: HostFilters }
 * Сохраняет фильтры для хоста.
 */
settingsRouter.post('/', async (req, res) => {
  try {
    const { host, filters } = req.body ?? {};
    if (!host || typeof host !== 'string') {
      res.status(400).json({ error: 'host required' });
      return;
    }
    const payload = filters && typeof filters === 'object' ? (filters as HostFilters) : {};
    await setFilters(host, payload);
    res.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to save settings';
    res.status(500).json({ error: message });
  }
});
