import { Router } from 'express';
import { fetchOlapReportV2 } from '../lib/iikoClient.js';
import { get, set, cacheKey } from '../lib/cache.js';

export const reportsRouter = Router();

const OLAP_CACHE_TTL_MS = 15 * 60 * 1000; // 15 минут

/**
 * POST /api/reports/olap
 * Использует OLAP v2 (POST JSON). Body: { serverUrl, token, report, from, to, groupByRowFields?, aggregateFields? }
 * from, to — даты DD.MM.YYYY. Ответы кэшируются на 15 минут по параметрам запроса.
 */
reportsRouter.post('/olap', async (req, res) => {
  try {
    const { serverUrl, token, ...params } = req.body ?? {};
    if (!serverUrl || !token) {
      res.status(400).json({ error: 'serverUrl and token required' });
      return;
    }
    const { report, from, to } = params;
    if (!report || !from || !to) {
      res.status(400).json({ error: 'report, from and to required' });
      return;
    }
    const olapParams = {
      report,
      from,
      to,
      groupByRowFields: params.groupByRowFields ?? params.groupRow,
      groupByColFields: params.groupByColFields ?? params.groupCol,
      aggregateFields: params.aggregateFields ?? params.agr,
      filters: params.filters,
    };
    const key = cacheKey(`olap:${serverUrl}:`, olapParams);
    const cached = get<unknown>(key);
    if (cached !== undefined) {
      return res.json(cached);
    }
    const raw = await fetchOlapReportV2(serverUrl, token, olapParams);
    const parsed = JSON.parse(raw);
    set(key, parsed, OLAP_CACHE_TTL_MS);
    res.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Report request failed';
    res.status(502).json({ error: message });
  }
});
