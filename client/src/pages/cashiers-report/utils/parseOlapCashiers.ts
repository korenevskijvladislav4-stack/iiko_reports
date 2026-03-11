type OlapRow = Record<string, string | number>;

const CASHIER_KEYS = ['Cashier', 'cashier'];
const DEPT_KEYS = ['Department', 'department'];
const SUM_KEYS = ['DishSumInt', 'dishSumInt', 'DishDiscountSumInt', 'OrderSum'];
const ORDER_KEYS = ['UniqOrderId', 'uniqOrderId'];
const AMOUNT_KEYS = ['DishAmountInt', 'dishAmountInt'];

function getFirstVal(item: OlapRow, keys: string[]): string | number | undefined {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  const dimensions = item.dimensions ?? item.fields;
  if (dimensions && typeof dimensions === 'object' && !Array.isArray(dimensions)) {
    const dim = dimensions as Record<string, unknown>;
    for (const k of keys) {
      const v = dim[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v as string | number;
    }
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

function normalizeOlapRows(rowsArr: unknown[], data: Record<string, unknown>): OlapRow[] {
  if (rowsArr.length === 0) return [];
  const first = rowsArr[0];
  if (!Array.isArray(first)) return rowsArr as OlapRow[];
  const report = (data.report ?? data) as Record<string, unknown>;
  const rowFields = (report.rowFields ?? report.groupByRowFields ?? report.rowDimensions) as string[] | undefined;
  const aggFields = (report.aggregateFields ?? report.measures ?? report.columnIds) as string[] | undefined;
  const columns: string[] =
    Array.isArray(rowFields) && Array.isArray(aggFields)
      ? [...rowFields, ...aggFields]
      : Array.isArray(rowFields)
        ? rowFields
        : Array.isArray(aggFields)
          ? aggFields
          : [];
  if (columns.length === 0) return rowsArr as OlapRow[];
  return rowsArr.map((row) => {
    if (!Array.isArray(row)) return row as OlapRow;
    const obj: OlapRow = {};
    row.forEach((val, i) => {
      obj[columns[i] ?? `col_${i}`] = val as string | number;
    });
    return obj;
  });
}

export interface ParseOlapCashiersResult {
  rows: import('../types').CashierRow[];
  departments: string[];
}

export function parseOlapToCashierRows(olapData: unknown): ParseOlapCashiersResult {
  const data = olapData as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') return { rows: [], departments: [] };

  let rowsArr: OlapRow[] = [];
  const obj = data as Record<string, unknown>;
  const report = obj.report as Record<string, unknown> | undefined;
  if (Array.isArray(obj.rows)) rowsArr = obj.rows as OlapRow[];
  else if (Array.isArray(obj.row)) rowsArr = obj.row as OlapRow[];
  else if (report && Array.isArray(report.rows)) rowsArr = report.rows as OlapRow[];
  else if (report && Array.isArray(report.row)) rowsArr = report.row as OlapRow[];
  else if (Array.isArray(obj.data)) rowsArr = obj.data as OlapRow[];
  rowsArr = normalizeOlapRows(rowsArr as unknown[], obj);

  const departments = new Set<string>();
  const cashierRows: import('../types').CashierRow[] = [];

  for (const r of rowsArr) {
    const cashier = (getFirstVal(r, CASHIER_KEYS) ?? '—').toString().trim() || '—';
    const department = (getFirstVal(r, DEPT_KEYS) ?? '—').toString().trim() || '—';
    const revenue = getNum(r, SUM_KEYS);
    const orders = getNum(r, ORDER_KEYS);
    const dishAmount = getNum(r, AMOUNT_KEYS);
    const avgCheck = orders > 0 ? revenue / orders : 0;
    departments.add(department);
    cashierRows.push({
      key: `${cashier}\t${department}`,
      cashier,
      department,
      revenue,
      orders,
      dishAmount,
      avgCheck,
      sharePct: 0,
    });
  }

  const totalRevenue = cashierRows.reduce((s, x) => s + x.revenue, 0);
  cashierRows.forEach((x) => {
    x.sharePct = totalRevenue > 0 ? (x.revenue / totalRevenue) * 100 : 0;
  });

  return {
    rows: cashierRows,
    departments: Array.from(departments).sort(),
  };
}
