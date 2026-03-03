import prisma from '@/lib/prisma.js';
import IikoCredentialsService from '@/modules/iiko-credentials/iiko-credentials.service.js';
import { fetchOlapReportV2 } from '@/lib/iikoClient.js';
import { HttpNotFoundError } from '@/lib/errors.js';

function normalizeHostKey(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || url;
}

export default class ProductsService {
  private iikoCreds = new IikoCredentialsService();

  async sync(companyId: string): Promise<void> {
    const { serverUrl, token, hostKey } = await this.iikoCreds.getToken(companyId);
    const to = new Date();
    const from = new Date(to.getFullYear() - 2, to.getMonth(), to.getDate());
    const fromStr = `${String(from.getDate()).padStart(2, '0')}.${String(from.getMonth() + 1).padStart(2, '0')}.${from.getFullYear()}`;
    const toStr = `${String(to.getDate()).padStart(2, '0')}.${String(to.getMonth() + 1).padStart(2, '0')}.${to.getFullYear()}`;
    const raw = await fetchOlapReportV2(serverUrl, token, {
      report: 'SALES',
      from: fromStr,
      to: toStr,
      groupByRowFields: ['DishName', 'DishGroup', 'DishId'] as const,
      aggregateFields: ['DishSumInt'] as const,
    });
    const data = JSON.parse(raw) as Record<string, unknown>;
    const report = (data.report ?? data) as Record<string, unknown>;
    let rows: unknown[] = [];
    if (Array.isArray(report?.rows)) rows = report.rows;
    else if (Array.isArray(report?.row)) rows = report.row;
    else if (Array.isArray((report as Record<string, unknown>)?.data)) rows = (report as Record<string, unknown>).data as unknown[];
    else if (Array.isArray(data.rows)) rows = data.rows as unknown[];
    else if (Array.isArray(data.row)) rows = data.row as unknown[];
    else if (Array.isArray(data.data)) rows = data.data as unknown[];

    type OlapRow = Record<string, string | number>;
    const list: { id: string; name: string; groupName: string | null }[] = [];
    const seen = new Set<string>();
    for (const r of rows as OlapRow[]) {
      let name = '';
      let groupName: string | null = null;
      let id = '';
      const n = r['DishName'] ?? r['dishName'] ?? r['Dish'] ?? r['dish'];
      if (n != null) name = String(n).trim();
      const g = r['DishGroup'] ?? r['DishGroup.TopParent'] ?? r['DishCategory'] ?? r['category'];
      if (g != null) groupName = String(g).trim() || null;
      const did = r['DishId'] ?? r['dishId'];
      if (did != null) id = String(did).trim();
      if (!id || !name) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      list.push({ id, name, groupName });
    }

    await prisma.companyProduct.deleteMany({ where: { companyId, hostKey } });
    for (const p of list) {
      await prisma.companyProduct.create({
        data: {
          companyId,
          hostKey,
          productId: p.id,
          name: p.name,
          groupName: p.groupName,
        },
      });
    }
  }

  async mapById(companyId: string): Promise<Map<string, string>> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) return new Map<string, string>();
    const hostKey = normalizeHostKey(creds.serverUrl);
    const rows = await prisma.companyProduct.findMany({
      where: { companyId, hostKey },
      select: { productId: true, name: true },
    });
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.productId, r.name);
    }
    return map;
  }

  async groupsById(companyId: string): Promise<Map<string, string>> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) return new Map<string, string>();
    const hostKey = normalizeHostKey(creds.serverUrl);
    const rows = await prisma.companyProduct.findMany({
      where: { companyId, hostKey },
      select: { productId: true, groupName: true },
    });
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.groupName) map.set(r.productId, r.groupName);
    }
    return map;
  }

  async delete(companyId: string, productId: string): Promise<void> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) throw new HttpNotFoundError('iiko credentials not set');
    const hostKey = normalizeHostKey(creds.serverUrl);
    const id = String(productId ?? '').trim();
    if (!id) return;
    await prisma.companyProduct.deleteMany({
      where: { companyId, hostKey, productId: id },
    });
  }
}

