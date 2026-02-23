import { Router } from 'express';
import { fetchOlapReportV2 } from '../lib/iikoClient.js';

export const reportsRouter = Router();

/**
 * POST /api/reports/olap
 * Использует OLAP v2 (POST JSON). Body: { serverUrl, token, report, from, to, groupByRowFields?, aggregateFields? }
 * from, to — даты DD.MM.YYYY.
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
    const raw = await fetchOlapReportV2(serverUrl, token, {
      report,
      from,
      to,
      groupByRowFields: params.groupByRowFields ?? params.groupRow,
      groupByColFields: params.groupByColFields ?? params.groupCol,
      aggregateFields: params.aggregateFields ?? params.agr,
      filters: params.filters,
    });
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Report request failed';
    res.status(502).json({ error: message });
  }
});
