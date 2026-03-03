import prisma from '@/lib/prisma.js';
import IikoCredentialsService from '@/modules/iiko-credentials/iiko-credentials.service.js';
import ProductsService from '@/modules/products/products.service.js';
import { fetchOlapReportV2 } from '@/lib/iikoClient.js';

type RawStoreBalanceItem = {
  store: string;
  product: string;
  amount: number;
  sum: number;
  productName?: string;
  name?: string;
  [key: string]: unknown;
};

export type StoreBalanceRow = {
  pointName: string;
  departmentId: string | null;
  storeId: string;
  productId: string;
  productName: string | null;
  productGroup: string | null;
  amount: number;
  sum: number;
};

type SalesDay = {
  date: string;
  quantitySold: number;
};

export type StoreBalanceRowWithSales = StoreBalanceRow & {
  totalSold: number;
  salesByDay: SalesDay[];
};

type OlapRow = Record<string, string | number>;

const DATE_KEYS = ['OpenDate.Typed', 'OpenDate', 'date'];
const DISH_ID_KEYS = ['DishId', 'dishId'];
const DEPARTMENT_KEYS = ['Department', 'department'];
const AMOUNT_KEYS = ['DishAmountInt', 'dishAmountInt', 'DishAmount', 'Amount.Int'];

function getNum(r: OlapRow, keys: string[]): number {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null) return Number(v) || 0;
  }
  const nested = (r as any).values ?? (r as any).aggregates ?? (r as any).data ?? (r as any).measures;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const obj = nested as Record<string, unknown>;
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null) return Number(v) || 0;
    }
  }
  return 0;
}

function getFirstVal(item: OlapRow, keys: string[]): string | number | undefined {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
}

function normalizeDateToIso(d: string): string {
  const s = d.trim();
  if (!s) return s;
  if (s.includes('T')) return s.slice(0, 10);
  if (s.includes('.')) {
    const [dd, mm, yy] = s.split('.').map((p) => p.trim());
    if (dd && mm && yy) {
      return `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

function formatDateToDdMmYyyy(date: Date): string {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

export default class StoreBalanceService {
  private iikoCreds = new IikoCredentialsService();
  private productsService = new ProductsService();

  async getReport(companyId: string, from?: string, to?: string): Promise<StoreBalanceRowWithSales[]> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) return [];
    const hostKey = creds.serverUrl.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || creds.serverUrl;

    // Берём все точки, у которых есть departmentId — по каждой будем запрашивать остатки
    const points = await prisma.companyPoint.findMany({
      where: { companyId, hostKey, departmentId: { not: null } },
      select: { pointName: true, departmentId: true },
      orderBy: { pointName: 'asc' },
    });
    if (points.length === 0) return [];

    const { serverUrl, token } = await this.iikoCreds.getToken(companyId);
    const baseUrl = serverUrl.trim().replace(/\/+$/, '') + '/resto/';
    let productsById = await this.productsService.mapById(companyId);
    let groupsById = await this.productsService.groupsById(companyId);
    if (productsById.size === 0) {
      await this.productsService.sync(companyId);
      productsById = await this.productsService.mapById(companyId);
      groupsById = await this.productsService.groupsById(companyId);
    }

    const allRows: StoreBalanceRow[] = [];
    for (const p of points) {
      const departmentId = p.departmentId as string;
      // Эндпоинт reports/balance/stores ожидает GET; фильтрацию по подразделениям пробуем передать через query
      const params = new URLSearchParams();
      params.set('key', token);
      // timestamp — ожидается просто дата 'YYYY-MM-DD'
      const iso = new Date().toISOString(); // 2026-03-03T09:18:13.000Z
      const ts = iso.slice(0, 10); // 2026-03-03
      params.set('timestamp', ts);
      // Фильтр по подразделению. Документация разнится, поэтому передаём сразу несколько вариантов:
      params.append('departmentIds', departmentId);
      params.append('departmentId', departmentId);
      params.append('department', departmentId);
      const url = `${baseUrl}api/v2/reports/balance/stores?${params.toString()}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        const text = await res.text();
        // Пропускаем неудачные департаменты, но не валим весь отчёт
        // eslint-disable-next-line no-console
        console.error(`[store-balance] request failed for department ${departmentId}: ${res.status} ${text}`);
        continue;
      }
      const data = (await res.json()) as unknown;
      const items: RawStoreBalanceItem[] = Array.isArray(data)
        ? (data as RawStoreBalanceItem[])
        : Array.isArray((data as any)?.rows)
          ? ((data as any).rows as RawStoreBalanceItem[])
          : [];
      for (const item of items) {
        if (!item.store || !item.product) continue;
        const productIdStr = String(item.product);
        const productNameFromRef = productsById.get(productIdStr);
        const groupNameFromRef = groupsById.get(productIdStr);
        allRows.push({
          pointName: p.pointName,
          departmentId,
          storeId: String(item.store),
          productId: productIdStr,
          productName: (productNameFromRef ?? '').trim() || null,
          productGroup: (groupNameFromRef ?? '').trim() || null,
          amount: Number(item.amount ?? 0),
          sum: Number(item.sum ?? 0),
        });
      }
    }

    // Если период не задан, берём последние 7 дней по умолчанию
    let periodFrom = from;
    let periodTo = to;
    if (!periodFrom || !periodTo) {
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() - 6);
      periodFrom = formatDateToDdMmYyyy(fromDate);
      periodTo = formatDateToDdMmYyyy(today);
    } else {
      const usesDot = periodFrom.includes('.') || periodTo.includes('.');
      if (!usesDot) {
        const [yf, mf, df] = periodFrom.split('-').map(Number);
        const [yt, mt, dt] = periodTo.split('-').map(Number);
        if (yf && mf && df && yt && mt && dt) {
          const fromDate = new Date(yf, mf - 1, df);
          const toDate = new Date(yt, mt - 1, dt);
          periodFrom = formatDateToDdMmYyyy(fromDate);
          periodTo = formatDateToDdMmYyyy(toDate);
        }
      }
    }

    const salesRaw = await fetchOlapReportV2(serverUrl, token, {
      report: 'SALES',
      from: periodFrom,
      to: periodTo,
      groupByRowFields: ['OpenDate.Typed', 'Department', 'DishId'],
      aggregateFields: ['DishAmountInt'],
    });

    const salesData = JSON.parse(salesRaw) as Record<string, unknown>;
    const report = (salesData.report ?? salesData) as Record<string, unknown>;
    const rowFields = (report?.rowFields ?? report?.groupByRowFields) as string[] | undefined;
    const aggFields = (report?.aggregateFields ?? report?.columnIds) as string[] | undefined;
    const columns: string[] =
      Array.isArray(rowFields) && Array.isArray(aggFields)
        ? [...rowFields, ...aggFields]
        : Array.isArray(rowFields)
          ? rowFields
          : [];

    let rawRows: unknown[] = [];
    if (Array.isArray(report?.rows)) rawRows = report.rows as unknown[];
    else if (Array.isArray(report?.row)) rawRows = report.row as unknown[];
    else if (Array.isArray(salesData.rows)) rawRows = salesData.rows as unknown[];
    else if (Array.isArray(salesData.data)) rawRows = salesData.data as unknown[];

    const rowsArr: OlapRow[] =
      rawRows.length > 0 && Array.isArray(rawRows[0])
        ? (rawRows as (string | number)[][]).map((arr) => {
            const obj: OlapRow = {};
            columns.forEach((col, i) => {
              obj[col] = arr[i] as string | number;
            });
            return obj;
          })
        : (rawRows as OlapRow[]);

    const salesMap = new Map<string, Map<string, number>>();
    for (const r of rowsArr) {
      const dateVal = getFirstVal(r, DATE_KEYS);
      const deptVal = getFirstVal(r, DEPARTMENT_KEYS);
      const dishIdVal = getFirstVal(r, DISH_ID_KEYS);
      if (!dateVal || !deptVal || !dishIdVal) continue;
      const isoDate = normalizeDateToIso(String(dateVal));
      const departmentName = String(deptVal).trim();
      const dishId = String(dishIdVal).trim();
      if (!isoDate || !departmentName || !dishId) continue;
      const qty = getNum(r, AMOUNT_KEYS);
      if (qty === 0) continue;
      const key = `${departmentName}\t${dishId}`;
      const byDate = salesMap.get(key) ?? new Map<string, number>();
      byDate.set(isoDate, (byDate.get(isoDate) ?? 0) + qty);
      salesMap.set(key, byDate);
    }

    // Преобразуем остатки, добавляя продажи по точке (Department/Точка) и товару
    const result: StoreBalanceRowWithSales[] = allRows.map((row) => {
      const key = `${row.pointName}\t${row.productId}`;
      const byDate = salesMap.get(key) ?? new Map<string, number>();
      const salesByDay: SalesDay[] = Array.from(byDate.entries())
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([date, quantitySold]) => ({ date, quantitySold }));
      const totalSold = salesByDay.reduce((acc, d) => acc + d.quantitySold, 0);
      return {
        ...row,
        totalSold,
        salesByDay,
      };
    });

    return result;
  }
}

