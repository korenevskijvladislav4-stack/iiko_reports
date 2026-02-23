import { Router } from 'express';
import { getPayTypes, syncPayTypesFromOlap, deletePayType } from '../db/payTypesStore.js';

export const payTypesRouter = Router();

/**
 * GET /api/pay-types?host=...
 * Список типов оплат из БД для хоста (для фильтров и т.п.).
 */
payTypesRouter.get('/', async (req, res) => {
  try {
    const host = (req.query.host as string)?.trim();
    if (!host) {
      res.status(400).json({ error: 'host query required' });
      return;
    }
    const list = await getPayTypes(host);
    res.json(list);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to get pay types';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/pay-types/sync
 * Body: { serverUrl: string, token: string }
 * Загружает уникальные типы оплат из iiko OLAP и сохраняет в БД.
 */
payTypesRouter.post('/sync', async (req, res) => {
  try {
    const { serverUrl, token } = req.body ?? {};
    if (!serverUrl || !token) {
      res.status(400).json({ error: 'serverUrl and token required' });
      return;
    }
    const list = await syncPayTypesFromOlap(serverUrl, token);
    res.json({ ok: true, count: list.length, list });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed';
    res.status(502).json({ error: message });
  }
});

/**
 * DELETE /api/pay-types
 * Body: { host: string, payType: string }
 * Удаляет одно значение из справочника типов оплат.
 */
payTypesRouter.delete('/', async (req, res) => {
  try {
    const { host, payType } = req.body ?? {};
    const h = (typeof host === 'string' ? host : '').trim();
    if (!h || typeof payType !== 'string' || !payType.trim()) {
      res.status(400).json({ error: 'host and payType required' });
      return;
    }
    const deleted = await deletePayType(h, payType);
    res.json({ ok: true, deleted });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Delete failed';
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/pay-types
 * Body: { host: string, payType: string }
 * Удаляет одно значение из справочника типов оплат.
 */
payTypesRouter.delete('/', async (req, res) => {
  try {
    const { host, payType } = req.body ?? {};
    const h = (typeof host === 'string' ? host : '').trim();
    if (!h || typeof payType !== 'string' || !payType.trim()) {
      res.status(400).json({ error: 'host and payType required' });
      return;
    }
    const deleted = await deletePayType(h, payType);
    res.json({ ok: true, deleted });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Delete failed';
    res.status(500).json({ error: message });
  }
});
