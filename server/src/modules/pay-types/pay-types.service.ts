import prisma from '@/lib/prisma.js';
import { fetchOlapReportV2 } from '@/lib/iikoClient.js';
import IikoCredentialsService from '@/modules/iiko-credentials/iiko-credentials.service.js';
import { HttpNotFoundError } from '@/lib/errors.js';

function normalizeHostKey(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || url;
}

function extractPayTypesFromOlap(raw: string): string[] {
  const data = JSON.parse(raw) as Record<string, unknown>;
  const report = (data.report ?? data) as Record<string, unknown>;
  let rows: unknown[] = [];
  if (Array.isArray(report?.rows)) rows = report.rows;
  else if (Array.isArray(report?.row)) rows = report.row;
  else if (Array.isArray((report as Record<string, unknown>)?.data)) rows = (report as Record<string, unknown>).data as unknown[];
  else if (Array.isArray(data.rows)) rows = data.rows as unknown[];
  else if (Array.isArray(data.row)) rows = data.row as unknown[];
  const set = new Set<string>();
  for (const r of rows) {
    let name = '';
    if (Array.isArray(r)) name = r[0] != null ? String(r[0]).trim() : '';
    else if (r && typeof r === 'object') {
      const row = r as Record<string, unknown>;
      const v = row['PayTypes'] ?? row['payTypes'] ?? row['PayType'];
      name = v != null ? String(v).trim() : '';
    }
    if (name && name !== 'PayTypes' && name.toLowerCase() !== 'paytypes') set.add(name);
  }
  return Array.from(set);
}

export default class PayTypesService {
  private iikoCreds = new IikoCredentialsService();

  async list(companyId: string): Promise<string[]> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) return [];
    const hostKey = normalizeHostKey(creds.serverUrl);
    const rows = await prisma.companyPayType.findMany({
      where: { companyId, hostKey },
      orderBy: { payType: 'asc' },
      select: { payType: true },
    });
    return rows.map((r) => r.payType);
  }

  async sync(companyId: string): Promise<string[]> {
    return this.iikoCreds.withToken(companyId, async ({ serverUrl, token, hostKey }) => {
      const to = new Date();
      const from = new Date(to.getFullYear() - 2, to.getMonth(), to.getDate());
      const fromStr = `${String(from.getDate()).padStart(2, '0')}.${String(from.getMonth() + 1).padStart(2, '0')}.${from.getFullYear()}`;
      const toStr = `${String(to.getDate()).padStart(2, '0')}.${String(to.getMonth() + 1).padStart(2, '0')}.${to.getFullYear()}`;
      const raw = await fetchOlapReportV2(serverUrl, token, {
        report: 'SALES',
        from: fromStr,
        to: toStr,
        groupByRowFields: ['PayTypes'],
        aggregateFields: ['DishSumInt'],
      });
      const names = extractPayTypesFromOlap(raw);
      for (const name of names) {
        await prisma.companyPayType.upsert({
          where: { companyId_hostKey_payType: { companyId, hostKey, payType: name } },
          create: { companyId, hostKey, payType: name },
          update: {},
        });
      }
      return names;
    });
  }

  async delete(companyId: string, payType: string): Promise<boolean> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) throw new HttpNotFoundError('iiko credentials not set');
    const hostKey = normalizeHostKey(creds.serverUrl);
    const name = String(payType ?? '').trim();
    if (!name) return false;
    const result = await prisma.companyPayType.deleteMany({
      where: { companyId, hostKey, payType: name },
    });
    return result.count > 0;
  }
}
