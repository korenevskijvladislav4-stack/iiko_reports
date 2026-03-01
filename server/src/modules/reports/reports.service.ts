import { fetchOlapReportV2, type OlapV2Params } from '@/lib/iikoClient.js';
import { get, set, cacheKey } from '@/lib/cache.js';
import IikoCredentialsService from '@/modules/iiko-credentials/iiko-credentials.service.js';
import { HttpBadRequestError } from '@/lib/errors.js';

const OLAP_CACHE_TTL_MS = 15 * 60 * 1000;

export default class ReportsService {
  private iikoCreds = new IikoCredentialsService();

  async getOlapReport(companyId: string, params: OlapV2Params): Promise<unknown> {
    const { report, from, to } = params;
    if (!report || !from || !to) throw new HttpBadRequestError('report, from and to required');
    const creds = await this.iikoCreds.getToken(companyId);
    const olapParams: OlapV2Params = {
      report: params.report,
      from: params.from,
      to: params.to,
      groupByRowFields: params.groupByRowFields,
      groupByColFields: params.groupByColFields,
      aggregateFields: params.aggregateFields,
      filters: params.filters,
    };
    const key = cacheKey(`olap:${creds.hostKey}:`, olapParams);
    const cached = get<unknown>(key);
    if (cached !== undefined) return cached;
    const raw = await fetchOlapReportV2(creds.serverUrl, creds.token, olapParams);
    const parsed = JSON.parse(raw) as unknown;
    set(key, parsed, OLAP_CACHE_TTL_MS);
    return parsed;
  }
}
