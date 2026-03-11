import prisma from '@/lib/prisma.js';
import { fetchOlapReportV2 } from '@/lib/iikoClient.js';
import IikoCredentialsService from '@/modules/iiko-credentials/iiko-credentials.service.js';
import { HttpNotFoundError } from '@/lib/errors.js';

function normalizeHostKey(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || url;
}

/** Возможные ключи поля Delivery.IsDelivery в ответе OLAP (разные версии iiko) */
const DELIVERY_KEYS = [
  'Delivery.IsDelivery',
  'delivery.isDelivery',
  'Delivery_IsDelivery',
  'delivery_isDelivery',
  'DeliveryIsDelivery',
  'DeliveryFlag',
  'IsDelivery',
];

function extractValuesFromOlap(raw: string): string[] {
  const data = JSON.parse(raw) as Record<string, unknown>;
  const report = (data.report ?? data) as Record<string, unknown>;
  let rows: unknown[] = [];
  if (Array.isArray(report?.rows)) rows = report.rows;
  else if (Array.isArray(report?.row)) rows = report.row;
  else if (Array.isArray((report as Record<string, unknown>)?.data))
    rows = (report as Record<string, unknown>).data as unknown[];
  else if (Array.isArray(data.rows)) rows = data.rows as unknown[];
  else if (Array.isArray(data.row)) rows = data.row as unknown[];
  else if (Array.isArray(data.data)) rows = data.data as unknown[];
  const set = new Set<string>();
  for (const r of rows) {
    let val = '';
    if (Array.isArray(r)) {
      val = r[0] != null ? String(r[0]).trim() : '';
    } else if (r && typeof r === 'object') {
      const row = r as Record<string, unknown>;
      const v =
        DELIVERY_KEYS.map((k) => row[k]).find((x) => x != null && String(x).trim() !== '') ??
        Object.entries(row).find(
          ([k, x]) =>
            (k.toLowerCase().includes('delivery') || k.toLowerCase().includes('isDelivery')) &&
            x != null &&
            String(x).trim() !== ''
        )?.[1];
      val = v != null ? String(v).trim() : '';
    }
    if (val && !DELIVERY_KEYS.some((k) => val.toLowerCase() === k.toLowerCase())) set.add(val);
  }
  return Array.from(set);
}

export default class DeliveryFlagsService {
  private iikoCreds = new IikoCredentialsService();

  async list(companyId: string): Promise<string[]> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) return [];
    const hostKey = normalizeHostKey(creds.serverUrl);
    const rows = await prisma.companyDeliveryFlag.findMany({
      where: { companyId, hostKey },
      orderBy: { value: 'asc' },
      select: { value: true },
    });
    return rows.map((r) => r.value);
  }

  async sync(companyId: string): Promise<string[]> {
    return this.iikoCreds.withToken(companyId, async ({ serverUrl, token, hostKey }) => {
      const to = new Date();
      const from = new Date(to.getFullYear() - 2, to.getMonth(), to.getDate());
      const fromStr = `${String(from.getDate()).padStart(2, '0')}.${String(from.getMonth() + 1).padStart(2, '0')}.${from.getFullYear()}`;
      const toStr = `${String(to.getDate()).padStart(2, '0')}.${String(to.getMonth() + 1).padStart(2, '0')}.${to.getFullYear()}`;
      const olapParams = {
        from: fromStr,
        to: toStr,
        groupByRowFields: ['Delivery.IsDelivery'] as const,
        aggregateFields: ['DishSumInt'] as const,
      };
      const allValues = new Set<string>();
      for (const reportType of ['SALES', 'DELIVERIES'] as const) {
        try {
          const raw = await fetchOlapReportV2(serverUrl, token, {
            report: reportType,
            from: olapParams.from,
            to: olapParams.to,
            groupByRowFields: [...olapParams.groupByRowFields],
            aggregateFields: [...olapParams.aggregateFields],
          });
          const vals = extractValuesFromOlap(raw);
          vals.forEach((v) => allValues.add(v));
        } catch (e) {
          if (reportType === 'DELIVERIES') continue;
          throw e;
        }
      }
      const values = Array.from(allValues).sort();
      await prisma.companyDeliveryFlag.deleteMany({ where: { companyId, hostKey } });
      for (const value of values) {
        await prisma.companyDeliveryFlag.create({
          data: { companyId, hostKey, value },
        });
      }
      return values;
    });
  }

  async delete(companyId: string, value: string): Promise<void> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) throw new HttpNotFoundError('iiko credentials not set');
    const hostKey = normalizeHostKey(creds.serverUrl);
    await prisma.companyDeliveryFlag.deleteMany({
      where: { companyId, hostKey, value: String(value).trim() },
    });
  }
}
