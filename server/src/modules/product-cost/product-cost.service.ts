import prisma from '@/lib/prisma.js';
import { fetchOlapReportV2 } from '@/lib/iikoClient.js';
import IikoCredentialsService from '@/modules/iiko-credentials/iiko-credentials.service.js';
import { HttpBadRequestError } from '@/lib/errors.js';

type OlapRow = Record<string, string | number>;

const DISH_GROUP_KEYS = ['DishGroup', 'DishGroup.TopParent', 'DishCategory', 'category'];
const DISH_KEYS = ['DishName', 'DishFullName', 'Dish', 'dish'];
const AMOUNT_KEYS = ['DishAmountInt', 'dishAmountInt', 'DishAmount', 'Amount.Int'];
const COST_KEYS = ['ProductCostBase.ProductCost', 'ProductCostBase.OneItem', 'PrimeCost', 'CostInt', 'Cost'];
const PRICE_KEYS = ['DishDiscountSumInt.averagePrice', 'DishSumInt.averagePriceWithVAT', 'DishDiscountSumInt.averagePriceWithVAT', 'averagePrice'];

function getFirstVal(item: OlapRow, keys: string[]): string | number | undefined {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
}

function getNum(r: OlapRow, keys: string[]): number {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null) return Number(v) || 0;
  }
  const nested = r.values ?? r.aggregates ?? r.data ?? r.measures;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const obj = nested as Record<string, unknown>;
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null) return Number(v) || 0;
    }
  }
  return 0;
}

function parseTimeToMinutes(t: string | null | undefined): number {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!parts) return 0;
  return parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
}

function hoursBetween(startTime: string | null | undefined, endTime: string | null | undefined): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (end >= start) return (end - start) / 60;
  return (24 * 60 - start + end) / 60;
}

/** DD.MM.YYYY -> YYYY-MM-DD для БД */
function ddMmYyyyToIso(s: string): string {
  const [d, m, y] = s.trim().split(/\./).map(Number);
  if (!d || !m || !y) return s;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export type ProductCostRow = {
  productGroup: string;
  product: string;
  quantitySold: number;
  costFromIiko: number;
  departmentSalary: number;
  humanCost: number;
  /** Средняя/текущая цена продажи за единицу из iiko (руб) */
  currentPriceFromIiko: number;
};

export default class ProductCostService {
  private iikoCreds = new IikoCredentialsService();

  async getReport(companyId: string, from: string, to: string): Promise<{ rows: ProductCostRow[]; totalDepartmentSalary: number }> {
    if (!from || !to) throw new HttpBadRequestError('from and to required (YYYY-MM-DD or DD.MM.YYYY)');
    const fromNorm = from.includes('.') ? from : from.split('-').reverse().join('.');
    const toNorm = to.includes('.') ? to : to.split('-').reverse().join('.');
    const fromIso = from.includes('.') ? ddMmYyyyToIso(from) : from;
    const toIso = to.includes('.') ? ddMmYyyyToIso(to) : to;

    return this.iikoCreds.withToken(companyId, async ({ serverUrl, token }) => {
    const raw = await fetchOlapReportV2(serverUrl, token, {
      report: 'SALES',
      from: fromNorm,
      to: toNorm,
      groupByRowFields: ['DishGroup', 'DishName'],
      aggregateFields: ['DishAmountInt', 'ProductCostBase.ProductCost', 'DishDiscountSumInt.averagePrice'],
    });

    const data = JSON.parse(raw) as Record<string, unknown>;
    const report = (data.report ?? data) as Record<string, unknown>;
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
    else if (Array.isArray(data.rows)) rawRows = data.rows as unknown[];
    else if (Array.isArray(data.data)) rawRows = data.data as unknown[];

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

    const aggregated = new Map<string, { qty: number; cost: number; price: number }>();
    for (const r of rowsArr) {
      const group = (getFirstVal(r, DISH_GROUP_KEYS) ?? '—').toString().trim() || '—';
      const product = (getFirstVal(r, DISH_KEYS) ?? '—').toString().trim() || '—';
      const qty = getNum(r, AMOUNT_KEYS);
      const cost = getNum(r, COST_KEYS);
      const price = getNum(r, PRICE_KEYS);
      if (qty === 0) continue;
      const key = `${group}\t${product}`;
      const prev = aggregated.get(key) ?? { qty: 0, cost: 0, price: 0 };
      aggregated.set(key, { qty: prev.qty + qty, cost: prev.cost + cost, price: price > 0 ? price : prev.price });
    }

    const schedules = await prisma.userSchedule.findMany({
      where: {
        companyId,
        date: { gte: new Date(fromIso), lte: new Date(toIso) },
      },
      select: { userId: true, startTime: true, endTime: true },
    });

    const hoursByUser = new Map<string, number>();
    for (const s of schedules) {
      const h = hoursBetween(s.startTime, s.endTime);
      hoursByUser.set(s.userId, (hoursByUser.get(s.userId) ?? 0) + h);
    }

    const users = await prisma.user.findMany({
      where: { companyId },
      select: { id: true, departmentId: true, hourlyRate: true },
    });

    const salaryByDepartmentId = new Map<string, number>();
    for (const u of users) {
      const hours = hoursByUser.get(u.id) ?? 0;
      const rate = u.hourlyRate ?? 0;
      const deptId = u.departmentId ?? '__none__';
      salaryByDepartmentId.set(deptId, (salaryByDepartmentId.get(deptId) ?? 0) + hours * rate);
    }

    const departments = await prisma.department.findMany({
      where: { companyId },
      select: { id: true, productGroupValues: true },
    });

    // Несколько подразделений могут быть привязаны к одной группе товаров — суммируем зарплаты всех таких подразделений по каждой группе
    const salaryByProductGroup = new Map<string, number>();
    for (const dept of departments) {
      const vals = dept.productGroupValues as string[] | null | undefined;
      const salary = salaryByDepartmentId.get(dept.id) ?? 0;
      if (!Array.isArray(vals)) continue;
      for (const group of vals) {
        const g = String(group).trim();
        if (g) salaryByProductGroup.set(g, (salaryByProductGroup.get(g) ?? 0) + salary);
      }
    }

    // По каждой группе — суммарное количество проданных товаров (всех позиций этой группы)
    const totalQtyByGroup = new Map<string, number>();
    aggregated.forEach((v, k) => {
      const group = k.split('\t')[0] ?? '—';
      totalQtyByGroup.set(group, (totalQtyByGroup.get(group) ?? 0) + v.qty);
    });

    const totalDepartmentSalary = Array.from(salaryByDepartmentId.values()).reduce((a, b) => a + b, 0);

    // Человеческая стоимость = (сумма зарплат всех подразделений, занятых этой группой) / (количество всех проданных товаров данной группы)
    const result: ProductCostRow[] = [];
    aggregated.forEach((v, k) => {
      const [group, product] = k.split('\t');
      const g = group ?? '—';
      const p = product ?? '—';
      const groupSalary = salaryByProductGroup.get(g) ?? 0;
      const totalQty = totalQtyByGroup.get(g) ?? 1;
      const humanCost = totalQty > 0 ? groupSalary / totalQty : 0;
      result.push({
        productGroup: g,
        product: p,
        quantitySold: v.qty,
        costFromIiko: v.cost,
        departmentSalary: groupSalary,
        humanCost,
        currentPriceFromIiko: v.price,
      });
    });

    return { rows: result, totalDepartmentSalary };
    });
  }
}
