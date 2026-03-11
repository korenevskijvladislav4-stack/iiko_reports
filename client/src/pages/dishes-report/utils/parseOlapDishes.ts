type OlapRow = Record<string, string | number>;

const DISH_KEYS = ['DishName', 'DishFullName', 'Dish', 'dish'];
const CATEGORY_KEYS = ['DishCategory', 'DishGroup', 'DishGroup.TopParent', 'Category', 'category'];
const DEPT_KEYS = ['Department', 'department'];
const SUM_KEYS = ['DishSumInt', 'dishSumInt', 'DishDiscountSumInt', 'OrderSum'];
const AMOUNT_KEYS = ['DishAmountInt', 'dishAmountInt', 'DishAmount', 'Amount.Int'];
const COST_KEYS = ['ProductCostBase.ProductCost', 'ProductCostBase.OneItem', 'PrimeCost', 'CostInt', 'Cost'];

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

export interface ParseOlapDishesResult {
  rows: import('../types').DishRow[];
  categories: string[];
  departments: string[];
}

export function parseOlapToDishRows(olapData: unknown): ParseOlapDishesResult {
  const data = olapData as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') return { rows: [], categories: [], departments: [] };

  let rowsArr: OlapRow[] = [];
  const obj = data as Record<string, unknown>;
  const report = obj.report as Record<string, unknown> | undefined;
  if (Array.isArray(obj.rows)) rowsArr = obj.rows as OlapRow[];
  else if (Array.isArray(obj.row)) rowsArr = obj.row as OlapRow[];
  else if (report && Array.isArray(report.rows)) rowsArr = report.rows as OlapRow[];
  else if (report && Array.isArray(report.row)) rowsArr = report.row as OlapRow[];
  else if (Array.isArray(obj.data)) rowsArr = obj.data as OlapRow[];
  rowsArr = normalizeOlapRows(rowsArr as unknown[], obj);

  const categories = new Set<string>();
  const departments = new Set<string>();
  const dishRows: import('../types').DishRow[] = [];
  const keyUsed = new Set<string>();

  for (const r of rowsArr) {
    const dish = (getFirstVal(r, DISH_KEYS) ?? '—').toString().trim() || '—';
    const category = (getFirstVal(r, CATEGORY_KEYS) ?? '—').toString().trim() || '—';
    const department = (getFirstVal(r, DEPT_KEYS) ?? '—').toString().trim() || '—';
    const revenue = getNum(r, SUM_KEYS);
    const amount = getNum(r, AMOUNT_KEYS);
    const cost = getNum(r, COST_KEYS);
    if (revenue === 0 && amount === 0) continue;

    categories.add(category);
    departments.add(department);

    const key = `${dish}\t${category}\t${department}`;
    if (keyUsed.has(key)) {
      const existing = dishRows.find((x) => x.key === key);
      if (existing) {
        existing.amount += amount;
        existing.revenue += revenue;
        existing.cost += cost;
        existing.margin = existing.revenue - existing.cost;
        existing.marginPct = existing.revenue > 0 ? (existing.margin / existing.revenue) * 100 : 0;
        existing.avgPrice = existing.amount > 0 ? existing.revenue / existing.amount : 0;
      }
      continue;
    }
    keyUsed.add(key);

    const margin = revenue - cost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
    const avgPrice = amount > 0 ? revenue / amount : 0;

    dishRows.push({
      key,
      dish,
      category,
      department,
      amount,
      revenue,
      cost,
      margin,
      marginPct,
      sharePct: 0,
      avgPrice,
      hasCost: cost > 0,
    });
  }

  const totalRevenue = dishRows.reduce((s, x) => s + x.revenue, 0);
  dishRows.forEach((x) => {
    x.sharePct = totalRevenue > 0 ? (x.revenue / totalRevenue) * 100 : 0;
  });

  return {
    rows: dishRows,
    categories: Array.from(categories).sort(),
    departments: Array.from(departments).sort(),
  };
}
