import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { SalesRow, TodaySummary, WeekDayPoint, TopDishItem } from './types';

dayjs.extend(customParseFormat);

export const DISH_KEYS = ['DishAmountInt', 'dishAmountInt', 'DishAmount.Int', 'DishAmount', 'Amount.Int', 'dishAmount'];
export const SUM_KEYS = [
  'DishSumInt',
  'dishSumInt',
  'DishDiscountSumInt',
  'dishDiscountSumInt',
  'DishDiscountSumInt.withoutVAT',
  'OrderSum',
  'orderSum',
  'ResultSum',
  'resultSum',
  'TotalSum',
  'totalSum',
  'Sum',
  'sum',
];
export const ORDER_KEYS = ['UniqOrderId', 'uniqOrderId', 'UniqOrderId.Int', 'VoucherNum', 'voucherNum'];
export const AVG_CHECK_KEYS = [
  'DishDiscountSumInt.average',
  'dishDiscountSumInt.average',
  'DishSumInt.average',
  'dishSumInt.average',
];
export const GUEST_KEYS = ['GuestNum', 'guestNum'];

function getNum(r: SalesRow, keys: string[]): number {
  const keyLower = (s: string) => s.toLowerCase();
  const keysSet = new Set(keys.map(keyLower));
  const getFrom = (obj: Record<string, unknown>): number => {
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null) return Number(v) || 0;
    }
    for (const [objKey, val] of Object.entries(obj)) {
      if (keysSet.has(keyLower(objKey)) && val !== undefined && val !== null) return Number(val) || 0;
    }
    return NaN;
  };
  const top = r as unknown as Record<string, unknown>;
  let n = getFrom(top);
  if (!Number.isNaN(n)) return n;
  for (const nest of ['values', 'aggregates', 'data', 'measures', 'aggregate']) {
    const nested = top[nest];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      n = getFrom(nested as Record<string, unknown>);
      if (!Number.isNaN(n)) return n;
    }
    if (Array.isArray(nested)) {
      for (const item of nested) {
        if (item && typeof item === 'object') {
          const it = item as Record<string, unknown>;
          const id = (it.fieldId ?? it.name ?? it.key ?? it.id ?? '').toString();
          const val = it.value ?? it.amount;
          if (id && val !== undefined && val !== null && keysSet.has(keyLower(id))) return Number(val) || 0;
        }
      }
    }
  }
  return 0;
}

export function sumRowsAsObjects(rowsArr: unknown[], columns: string[]): TodaySummary {
  const asObjects: SalesRow[] = [];
  const first = rowsArr[0];
  let dataRows = rowsArr;
  let colNames = columns;
  if (Array.isArray(first) && first.length > 0 && first.every((c) => typeof c === 'string')) {
    colNames = first as unknown as string[];
    dataRows = rowsArr.slice(1);
  }
  for (const row of dataRows) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      asObjects.push(row as SalesRow);
    } else if (Array.isArray(row) && colNames.length > 0) {
      const o: SalesRow = {};
      row.forEach((val, i) => {
        o[colNames[i] ?? `col_${i}`] = val as string | number;
      });
      asObjects.push(o);
    }
  }
  if (asObjects.length === 0) return null;
  const revenue = asObjects.reduce((s, r) => s + getNum(r, SUM_KEYS), 0);
  const checks = asObjects.reduce((s, r) => s + getNum(r, ORDER_KEYS), 0);
  const guests = asObjects.reduce((s, r) => s + getNum(r, GUEST_KEYS), 0);
  const dishes = asObjects.reduce((s, r) => s + getNum(r, DISH_KEYS), 0);
  let avgCheckSum = 0;
  let avgCheckCount = 0;
  asObjects.forEach((r) => {
    const avg = getNum(r, AVG_CHECK_KEYS);
    const ord = getNum(r, ORDER_KEYS);
    if (avg > 0 && ord > 0) {
      avgCheckSum += avg * ord;
      avgCheckCount += ord;
    }
  });
  const avgCheck = avgCheckCount > 0 ? avgCheckSum / avgCheckCount : checks > 0 ? revenue / checks : 0;
  const revenuePerGuest = guests > 0 ? revenue / guests : 0;
  return {
    revenue,
    checks,
    guests,
    avgCheck: Math.round(avgCheck),
    revenuePerGuest: Math.round(revenuePerGuest),
    dishes,
  };
}

export function extractTodaySummary(data: unknown): TodaySummary {
  if (!data || typeof data !== 'object') return null;
  if (Array.isArray(data)) {
    return sumRowsAsObjects(data as unknown[], [
      'OpenDate.Typed',
      'DishSumInt',
      'GuestNum',
      'DishAmountInt',
      'UniqOrderId',
      'DishDiscountSumInt.average',
      'DishAmountInt.PerOrder',
    ]);
  }
  const obj = data as Record<string, unknown>;
  const report = (obj.report ?? obj) as Record<string, unknown>;
  const summaryRaw = (obj.summary ?? report?.summary) as Record<string, unknown> | undefined;
  let rows: unknown[] = [];
  if (Array.isArray(obj.rows)) rows = obj.rows;
  else if (Array.isArray(obj.row)) rows = obj.row;
  else if (Array.isArray(report?.rows)) rows = report.rows as unknown[];
  else if (Array.isArray(report?.row)) rows = report.row as unknown[];
  else if (Array.isArray(obj.data)) rows = obj.data;
  else if (Array.isArray(report?.data)) rows = report.data as unknown[];
  else if (report && typeof report.table === 'object' && report.table !== null) {
    const table = report.table as Record<string, unknown>;
    if (Array.isArray(table.rows)) rows = table.rows;
    else if (Array.isArray(table.row)) rows = table.row;
    else if (Array.isArray(table.data)) rows = table.data;
  }
  if (rows.length === 0 && Array.isArray(obj.report)) rows = obj.report as unknown[];

  const rowFields = (report?.rowFields ?? report?.groupByRowFields) as string[] | undefined;
  const aggFields = (report?.aggregateFields ?? report?.measures) as string[] | undefined;
  const fallbackCols = ['OpenDate.Typed', 'DishSumInt', 'GuestNum', 'DishAmountInt', 'UniqOrderId', 'DishDiscountSumInt.average', 'DishAmountInt.PerOrder'];
  const columns = (Array.isArray(rowFields) && Array.isArray(aggFields) ? [...rowFields, ...aggFields] : fallbackCols) as string[];

  let revenue = 0;
  let checks = 0;
  let guests = 0;
  let dishes = 0;
  let avgCheckSum = 0;
  let avgCheckCount = 0;

  const summary = summaryRaw && typeof summaryRaw === 'object' ? (summaryRaw as SalesRow) : undefined;

  let fromSummary = { revenue: 0, checks: 0, guests: 0, dishes: 0, avgCheckSum: 0, avgCheckCount: 0 };
  if (summary) {
    fromSummary = {
      revenue: getNum(summary, SUM_KEYS),
      checks: getNum(summary, ORDER_KEYS),
      guests: getNum(summary, GUEST_KEYS),
      dishes: getNum(summary, DISH_KEYS),
      avgCheckSum: 0,
      avgCheckCount: 0,
    };
    const avg = getNum(summary, AVG_CHECK_KEYS);
    if (avg > 0) {
      fromSummary.avgCheckSum = avg * (fromSummary.checks || 1);
      fromSummary.avgCheckCount = fromSummary.checks || 1;
    }
  }

  let fromRows = { revenue: 0, checks: 0, guests: 0, dishes: 0, avgCheckSum: 0, avgCheckCount: 0 };
  if (rows.length > 0) {
    const asObjects: SalesRow[] = [];
    const firstRow = rows[0];
    let dataRows = rows;
    let colNames = columns;
    if (Array.isArray(firstRow) && firstRow.length > 0 && firstRow.every((c) => typeof c === 'string')) {
      colNames = firstRow as unknown as string[];
      dataRows = rows.slice(1);
    }
    for (const row of dataRows) {
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        asObjects.push(row as SalesRow);
      } else if (Array.isArray(row) && colNames.length > 0) {
        const o: SalesRow = {};
        row.forEach((val, i) => {
          o[colNames![i] ?? `col_${i}`] = val as string | number;
        });
        asObjects.push(o);
      }
    }
    if (asObjects.length > 0) {
      fromRows = {
        revenue: asObjects.reduce((s, r) => s + getNum(r, SUM_KEYS), 0),
        checks: asObjects.reduce((s, r) => s + getNum(r, ORDER_KEYS), 0),
        guests: asObjects.reduce((s, r) => s + getNum(r, GUEST_KEYS), 0),
        dishes: asObjects.reduce((s, r) => s + getNum(r, DISH_KEYS), 0),
        avgCheckSum: 0,
        avgCheckCount: 0,
      };
      asObjects.forEach((r) => {
        const avg = getNum(r, AVG_CHECK_KEYS);
        const ord = getNum(r, ORDER_KEYS);
        if (avg > 0 && ord > 0) {
          fromRows.avgCheckSum += avg * ord;
          fromRows.avgCheckCount += ord;
        }
      });
    }
  }

  const useRows =
    fromRows.revenue > 0 ||
    fromRows.checks > 0 ||
    fromRows.guests > 0 ||
    fromRows.dishes > 0;
  if (useRows) {
    revenue = fromRows.revenue;
    checks = fromRows.checks;
    guests = fromRows.guests;
    dishes = fromRows.dishes;
    avgCheckSum = fromRows.avgCheckSum;
    avgCheckCount = fromRows.avgCheckCount;
  } else {
    revenue = fromSummary.revenue;
    checks = fromSummary.checks;
    guests = fromSummary.guests;
    dishes = fromSummary.dishes;
    avgCheckSum = fromSummary.avgCheckSum;
    avgCheckCount = fromSummary.avgCheckCount;
  }

  const avgCheck = avgCheckCount > 0 ? avgCheckSum / avgCheckCount : (checks > 0 ? revenue / checks : 0);
  const revenuePerGuest = guests > 0 ? revenue / guests : 0;

  return {
    revenue,
    checks,
    guests,
    avgCheck: Math.round(avgCheck),
    revenuePerGuest: Math.round(revenuePerGuest),
    dishes,
  };
}

const DATE_KEYS = ['OpenDate.Typed', 'OpenDate', 'Date', 'date'];
const DISH_NAME_KEYS = ['DishName', 'DishFullName', 'Dish', 'dish'];

function getStr(r: SalesRow, keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/** Извлекает массив строк и имена колонок из ответа OLAP */
function getOlapRows(data: unknown): { rows: SalesRow[]; columns: string[] } | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const report = (obj.report ?? obj) as Record<string, unknown>;
  let rows: unknown[] = [];
  if (Array.isArray(obj.rows)) rows = obj.rows;
  else if (Array.isArray(obj.row)) rows = obj.row;
  else if (Array.isArray(report?.rows)) rows = report.rows as unknown[];
  else if (Array.isArray(report?.row)) rows = report.row as unknown[];
  else if (Array.isArray(obj.data)) rows = obj.data;
  else if (Array.isArray(report?.data)) rows = report.data as unknown[];
  const rowFields = (report?.rowFields ?? report?.groupByRowFields) as string[] | undefined;
  const aggFields = (report?.aggregateFields ?? report?.measures) as string[] | undefined;
  const columns = (Array.isArray(rowFields) && Array.isArray(aggFields)
    ? [...rowFields, ...aggFields]
    : ['OpenDate.Typed', 'DishSumInt']) as string[];
  const asObjects: SalesRow[] = [];
  const first = rows[0];
  let dataRows = rows;
  let colNames = columns;
  if (Array.isArray(first) && first.length > 0 && first.every((c) => typeof c === 'string')) {
    colNames = first as unknown as string[];
    dataRows = rows.slice(1);
  }
  for (const row of dataRows) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      asObjects.push(row as SalesRow);
    } else if (Array.isArray(row) && colNames.length > 0) {
      const o: SalesRow = {};
      row.forEach((val, i) => {
        o[colNames[i] ?? `col_${i}`] = val as string | number;
      });
      asObjects.push(o);
    }
  }
  return { rows: asObjects, columns: colNames };
}

/** Нормализует дату из OLAP в DD.MM для подписи графика */
function formatDateLabel(raw: string): string {
  const num = Number(raw);
  const d = Number.isFinite(num)
    ? dayjs(num)
    : dayjs(raw, ['DD.MM.YYYY', 'YYYY-MM-DD', 'DD.MM.YY']);
  if (d.isValid()) return d.format('DD.MM');
  if (raw.length >= 5) return raw.slice(0, 5);
  return raw || '—';
}

/** Нормализует дату из строки OLAP в DD.MM.YYYY для сравнения */
function rowDateToDdMmYyyy(r: SalesRow): string {
  const raw = getStr(r, DATE_KEYS);
  const n = Number(raw);
  const d = Number.isFinite(n) ? dayjs(n) : dayjs(raw, ['DD.MM.YYYY', 'YYYY-MM-DD', 'DD.MM.YY']);
  return d.isValid() ? d.format('DD.MM.YYYY') : raw;
}

/**
 * Извлекает сводку за один день из ответа OLAP за период (те же данные, что и для графика).
 * Используется один источник данных, чтобы выручка в шапке и на графике совпадала.
 */
export function extractTodayFromWeekData(data: unknown, todayStr: string): TodaySummary {
  const parsed = getOlapRows(data);
  if (!parsed || parsed.rows.length === 0) return null;
  const todayRows = parsed.rows.filter((r) => rowDateToDdMmYyyy(r) === todayStr);
  if (todayRows.length === 0) return null;
  const revenue = todayRows.reduce((s, r) => s + getNum(r, SUM_KEYS), 0);
  const checks = todayRows.reduce((s, r) => s + getNum(r, ORDER_KEYS), 0);
  const guests = todayRows.reduce((s, r) => s + getNum(r, GUEST_KEYS), 0);
  const dishes = todayRows.reduce((s, r) => s + getNum(r, DISH_KEYS), 0);
  let avgCheckSum = 0;
  let avgCheckCount = 0;
  todayRows.forEach((r) => {
    const avg = getNum(r, AVG_CHECK_KEYS);
    const ord = getNum(r, ORDER_KEYS);
    if (avg > 0 && ord > 0) {
      avgCheckSum += avg * ord;
      avgCheckCount += ord;
    }
  });
  const avgCheck = avgCheckCount > 0 ? avgCheckSum / avgCheckCount : checks > 0 ? revenue / checks : 0;
  const revenuePerGuest = guests > 0 ? revenue / guests : 0;
  return {
    revenue,
    checks,
    guests,
    avgCheck: Math.round(avgCheck),
    revenuePerGuest: Math.round(revenuePerGuest),
    dishes,
  };
}

/** Парсит ответ OLAP (продажи по дням) в массив для графика за неделю */
export function parseWeekRevenue(data: unknown): WeekDayPoint[] {
  const parsed = getOlapRows(data);
  if (!parsed || parsed.rows.length === 0) return [];
  const byDate = new Map<string, number>();
  for (const r of parsed.rows) {
    const dateStr = getStr(r, DATE_KEYS);
    if (!dateStr) continue;
    const rev = getNum(r, SUM_KEYS);
    byDate.set(dateStr, (byDate.get(dateStr) ?? 0) + rev);
  }
  return Array.from(byDate.entries())
    .map(([date, revenue]) => ({
      date,
      label: formatDateLabel(date),
      revenue: Math.round(revenue),
    }))
    .sort((a, b) => {
      const parse = (s: string) => {
        const n = Number(s);
        if (Number.isFinite(n)) return dayjs(n).valueOf();
        return dayjs(s, ['DD.MM.YYYY', 'YYYY-MM-DD']).valueOf();
      };
      const dA = parse(a.date);
      const dB = parse(b.date);
      if (!Number.isNaN(dA) && !Number.isNaN(dB)) return dA - dB;
      return String(a.date).localeCompare(String(b.date));
    });
}

/** Парсит ответ OLAP (продажи по блюдам) в топ-N по выручке */
export function parseTopDishes(data: unknown, limit = 5): TopDishItem[] {
  const parsed = getOlapRows(data);
  if (!parsed || parsed.rows.length === 0) return [];
  return parsed.rows
    .map((r) => ({
      name: getStr(r, DISH_NAME_KEYS) || '—',
      revenue: getNum(r, SUM_KEYS),
    }))
    .filter((x) => x.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
