import { useState, useEffect, type ReactNode } from 'react';
import {
  Card,
  Table,
  Button,
  Form,
  Alert,
  Typography,
  DatePicker,
  Space,
  Row,
  Col,
  Statistic,
  Select,
  message,
  Modal,
  List,
} from 'antd';
import { BarChartOutlined, ReloadOutlined, DownloadOutlined, RiseOutlined, UnorderedListOutlined, ArrowUpOutlined, ArrowDownOutlined, CalendarOutlined, ApartmentOutlined, CarOutlined, CreditCardOutlined, FilterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  CartesianGrid,
  Label,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchOlapReport, isTokenExpiredError, getSettings, saveSettings, getPayTypes, getDeliveryFlagValues } from '../../api/client';
import { formatMonthFromDate, getMonthKey } from '../../utils/parseOlapXml';
import type { SalesRow, SalesGroupBy, Totals, Ranges, TableRow } from './types';

const DATE_FIELD = 'OpenDate.Typed';
const DEPT_FIELD = 'Department';

const OLAP_GROUP_BY_ROW_FIELDS: Record<SalesGroupBy, string[]> = {
  day: ['OpenDate.Typed', 'Department'],
  week: ['YearOpen', 'WeekInYearOpen', 'Department'],
  month: ['YearOpen', 'Mounth', 'Department'],
  quarter: ['YearOpen', 'QuarterOpen', 'Department'],
};

function getFirstVal(item: SalesRow, keys: string[]): string | number | undefined {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  const dimensions = item.dimensions ?? item.fields;
  if (dimensions && typeof dimensions === 'object') {
    if (!Array.isArray(dimensions)) {
      const dim = dimensions as Record<string, unknown>;
      for (const k of keys) {
        const v = dim[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return v as string | number;
      }
    } else {
      const arr = dimensions as Array<{ fieldId?: string; name?: string; key?: string; value?: unknown }>;
      for (const entry of arr) {
        const fieldKey = (entry.fieldId ?? entry.name ?? entry.key ?? '').toString();
        if (keys.some((k) => k === fieldKey || k.toLowerCase() === fieldKey.toLowerCase())) {
          const v = entry.value;
          if (v !== undefined && v !== null && String(v).trim() !== '') return v as string | number;
        }
      }
    }
  }
  return undefined;
}

const YEAR_KEYS = ['YearOpen', 'yearOpen', 'Year'];
const MONTH_KEYS = ['Mounth', 'mounth', 'Month', 'month'];
const WEEK_KEYS = ['WeekInYearOpen', 'weekInYearOpen', 'WeekInYear'];
const QUARTER_KEYS = ['QuarterOpen', 'quarterOpen', 'Quarter'];
const RU_MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function parseMonthNumber(val: string | number): number {
  const n = Number(val);
  if (n >= 1 && n <= 12) return n;
  if (n >= 0 && n <= 11) return n + 1;
  const s = String(val).trim();
  // Формат iiko: "08 (Август)" — число в начале или название месяца в скобках
  const leadNum = s.match(/^\s*(\d{1,2})/);
  if (leadNum) {
    const m = Number(leadNum[1]);
    if (m >= 1 && m <= 12) return m;
  }
  const i = RU_MONTH_NAMES.findIndex((name) => s.toLowerCase().includes(name.toLowerCase()));
  return i >= 0 ? i + 1 : 0;
}

function getMonthKeyFromYearAndMonth(item: SalesRow): string {
  let year = getFirstVal(item, YEAR_KEYS);
  let monthVal = getFirstVal(item, MONTH_KEYS);
  if (year == null || monthVal == null) {
    for (const key of Object.keys(item)) {
      const lower = key.toLowerCase();
      if ((/year|год/.test(lower) || lower === 'yearopen') && year == null) year = getFirstVal(item, [key]) ?? year;
      if ((/month|mounth|месяц/.test(lower) || lower === 'mounth') && monthVal == null) monthVal = getFirstVal(item, [key]) ?? monthVal;
    }
  }
  if (year != null && monthVal != null) {
    let y = String(year).trim();
    const yearNum = Number(year);
    const m = parseMonthNumber(monthVal);
    // Нормальный порядок: год 1990–2100, месяц 1–12
    if (m >= 1 && m <= 12 && yearNum >= 1900 && yearNum <= 2100) {
      const yearStr = /^\d{4}$/.test(y) ? y : String(yearNum);
      return `${yearStr}-${String(m).padStart(2, '0')}`;
    }
    // Порядок колонок [Month, Year]: в year пришёл месяц (1–12), в monthVal — год
    if (yearNum >= 1 && yearNum <= 12) {
      const possibleYear = Number(monthVal);
      if (possibleYear >= 1900 && possibleYear <= 2100) {
        return `${possibleYear}-${String(yearNum).padStart(2, '0')}`;
      }
    }
    // Порядок колонок [Department, Year, Month]: YearOpen=департамент, Mounth=год, Department=месяц
    if (Number(monthVal) >= 1900 && Number(monthVal) <= 2100 && parseMonthNumber(monthVal) === 0) {
      const monthFromOther = getFirstVal(item, ['Department', 'department']);
      const mOther = parseMonthNumber(monthFromOther ?? 0);
      if (mOther >= 1 && mOther <= 12) return `${Number(monthVal)}-${String(mOther).padStart(2, '0')}`;
    }
    if (/^\d{2}$/.test(y)) y = Number(y) >= 50 ? `19${y}` : `20${y}`;
    if (m >= 1 && m <= 12) {
      const yearStr = /^\d{4}$/.test(y) ? y : String(new Date().getFullYear());
      return `${yearStr}-${String(m).padStart(2, '0')}`;
    }
  }
  return getMonthKey(item[DATE_FIELD] ?? item['OpenDate.Typed']);
}

/** Ключ периода для сортировки по выбранной группировке (day/week/month). */
function getPeriodKey(item: SalesRow, groupBy: SalesGroupBy): string {
  if (groupBy === 'day') {
    const dateVal = item[DATE_FIELD] ?? item['OpenDate.Typed'];
    if (dateVal == null) return '';
    const s = String(dateVal).trim();
    const iso = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return dayjs(d).format('YYYY-MM-DD');
    return s;
  }
  if (groupBy === 'week') {
    const year = getFirstVal(item, YEAR_KEYS);
    const week = getFirstVal(item, WEEK_KEYS);
    if (year != null && week != null) {
      const y = String(year).trim();
      const w = String(Number(week)).padStart(2, '0');
      return /^\d{4}$/.test(y) ? `${y}-W${w}` : '';
    }
    return '';
  }
  if (groupBy === 'quarter') {
    const year = getFirstVal(item, YEAR_KEYS);
    const quarterVal = getFirstVal(item, QUARTER_KEYS);
    if (year != null && quarterVal != null) {
      const y = String(year).trim();
      const qStr = String(quarterVal).trim();
      const qMatch = qStr.match(/Q?([1-4])/i);
      const q = qMatch ? Number(qMatch[1]) : Number(quarterVal);
      if (q >= 1 && q <= 4 && /^\d{4}$/.test(y)) return `${y}-Q${q}`;
    }
    return '';
  }
  return getMonthKeyFromYearAndMonth(item);
}

/** Подпись периода для таблицы и графиков. */
function formatPeriodLabel(periodKey: string, groupBy: SalesGroupBy): string {
  if (!periodKey) return '—';
  if (groupBy === 'day') {
    const d = periodKey.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (d) return `${d[3]}.${d[2]}.${d[1]}`;
    return periodKey;
  }
  if (groupBy === 'week') {
    const m = periodKey.match(/^(\d{4})-W(\d{2})$/);
    if (m) return `Нед. ${Number(m[2])}, ${m[1]}`;
    return periodKey;
  }
  if (groupBy === 'quarter') {
    const m = periodKey.match(/^(\d{4})-Q([1-4])$/);
    if (m) return `${m[2]} кв. ${m[1]}`;
    return periodKey;
  }
  return formatMonthFromDate(periodKey.length === 7 ? `${periodKey}-01` : periodKey);
}

const DISH_KEYS = ['DishAmountInt', 'dishAmountInt', 'DishAmount.Int', 'DishAmount', 'Amount.Int', 'dishAmount'];
const SUM_KEYS = ['DishSumInt', 'dishSumInt', 'DishDiscountSumInt', 'dishDiscountSumInt', 'DishDiscountSumInt.withoutVAT', 'OrderSum', 'orderSum'];
const ORDER_KEYS = ['UniqOrderId', 'uniqOrderId', 'UniqOrderId.Int', 'VoucherNum', 'voucherNum'];
const AVG_CHECK_KEYS = ['DishDiscountSumInt.average', 'dishDiscountSumInt.average', 'DishSumInt.average', 'dishSumInt.average'];
const AVG_FILL_KEYS = ['DishAmountInt.PerOrder', 'DishAmountInt.perOrder', 'dishAmountInt.PerOrder', 'dishAmountInt.perOrder'];

function getNum(r: SalesRow, keys: string[]): number {
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

/** Сортировка предприятий: сначала по сохранённому порядку, остальные — по алфавиту. */
function sortDepartments(deptKeys: string[], departmentOrder?: string[]): string[] {
  if (!departmentOrder || departmentOrder.length === 0) return [...deptKeys].sort();
  const set = new Set(deptKeys);
  const ordered = departmentOrder.filter((d) => set.has(d));
  const rest = deptKeys.filter((d) => !departmentOrder.includes(d)).sort();
  return [...ordered, ...rest];
}

function aggregateByDepartmentAndPeriod(
  rows: SalesRow[],
  groupBy: SalesGroupBy,
  departmentOrder?: string[]
): {
  tableRows: TableRow[];
  totals: Totals;
  ranges: Ranges | null;
} {
  const DEPT_KEYS = [DEPT_FIELD, 'department'];
  const byDept = new Map<string, SalesRow[]>();
  for (const r of rows) {
    const dept = (getFirstVal(r, DEPT_KEYS) ?? r[DEPT_FIELD] ?? '—').toString().trim() || '—';
    if (!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept)!.push(r);
  }

  const tableRows: TableRow[] = [];
  const deptKeys = Array.from(byDept.keys());
  const sortedDepts = sortDepartments(deptKeys, departmentOrder);

  for (const department of sortedDepts) {
    const items = byDept.get(department)!;
    const byPeriod = new Map<string, { dishAmount: number; dishSum: number; uniqOrderId: number; avgCheck: number; avgFill: number }>();
    for (const item of items) {
      const periodKey = getPeriodKey(item, groupBy);
      if (!periodKey) continue;
      const avgCheckApi = getNum(item, AVG_CHECK_KEYS);
      const avgFillApi = getNum(item, AVG_FILL_KEYS);
      if (!byPeriod.has(periodKey)) byPeriod.set(periodKey, { dishAmount: 0, dishSum: 0, uniqOrderId: 0, avgCheck: 0, avgFill: 0 });
      const m = byPeriod.get(periodKey)!;
      m.dishAmount += getNum(item, DISH_KEYS);
      m.dishSum += getNum(item, SUM_KEYS);
      m.uniqOrderId += getNum(item, ORDER_KEYS);
      if (avgCheckApi > 0) m.avgCheck = avgCheckApi;
      if (avgFillApi > 0) m.avgFill = avgFillApi;
    }

    const deptTotals = { dishAmount: 0, dishSum: 0, uniqOrderId: 0 };
    const periodValues: { dishAmount: number; dishSum: number; uniqOrderId: number; avgCheck: number; avgFill: number }[] = [];
    byPeriod.forEach((m) => {
      deptTotals.dishAmount += m.dishAmount;
      deptTotals.dishSum += m.dishSum;
      deptTotals.uniqOrderId += m.uniqOrderId;
      const avgCheck = m.avgCheck > 0 ? m.avgCheck : (m.uniqOrderId > 0 ? m.dishSum / m.uniqOrderId : 0);
      const avgFill = m.avgFill > 0 ? m.avgFill : (m.uniqOrderId > 0 ? m.dishAmount / m.uniqOrderId : 0);
      periodValues.push({ ...m, avgCheck, avgFill });
    });

    const deptAvgCheck = deptTotals.uniqOrderId > 0 ? deptTotals.dishSum / deptTotals.uniqOrderId : 0;
    const deptAvgFill = deptTotals.uniqOrderId > 0 ? deptTotals.dishAmount / deptTotals.uniqOrderId : 0;

    const validDish = periodValues.map((x) => x.dishAmount).filter((v) => v > 0);
    const validSum = periodValues.map((x) => x.dishSum).filter((v) => v > 0);
    const validOrder = periodValues.map((x) => x.uniqOrderId).filter((v) => v > 0);
    const validAvgCheck = periodValues.map((x) => x.avgCheck).filter((v) => v > 0);
    const validAvgFill = periodValues.map((x) => x.avgFill).filter((v) => v > 0);
    const deptRanges: Ranges = {
      dishAmount: { min: validDish.length ? Math.min(...validDish) : 0, max: validDish.length ? Math.max(...validDish) : 0 },
      dishSum: { min: validSum.length ? Math.min(...validSum) : 0, max: validSum.length ? Math.max(...validSum) : 0 },
      uniqOrderId: { min: validOrder.length ? Math.min(...validOrder) : 0, max: validOrder.length ? Math.max(...validOrder) : 0 },
      avgCheck: { min: validAvgCheck.length ? Math.min(...validAvgCheck) : 0, max: validAvgCheck.length ? Math.max(...validAvgCheck) : 0 },
      avgFill: { min: validAvgFill.length ? Math.min(...validAvgFill) : 0, max: validAvgFill.length ? Math.max(...validAvgFill) : 0 },
    };

    tableRows.push({
      type: 'group',
      key: `group-${department}`,
      department: `📁 ${department}`,
      departmentKey: department,
      period: 'ВСЕГО:',
      dishAmount: deptTotals.dishAmount,
      uniqOrderId: deptTotals.uniqOrderId,
      dishSum: deptTotals.dishSum,
      avgCheck: deptAvgCheck,
      avgFill: deptAvgFill,
    });

    const periodKeys = Array.from(byPeriod.keys()).sort();
    for (const periodKey of periodKeys) {
      const m = byPeriod.get(periodKey)!;
      const period = formatPeriodLabel(periodKey, groupBy);
      const avgCheck = m.avgCheck > 0 ? m.avgCheck : (m.uniqOrderId > 0 ? m.dishSum / m.uniqOrderId : 0);
      const avgFill = m.avgFill > 0 ? m.avgFill : (m.uniqOrderId > 0 ? m.dishAmount / m.uniqOrderId : 0);
      tableRows.push({
        type: 'month',
        key: `${department}-${periodKey}`,
        department: '',
        departmentKey: department,
        period,
        periodSortKey: periodKey,
        dishAmount: m.dishAmount,
        uniqOrderId: m.uniqOrderId,
        dishSum: m.dishSum,
        avgCheck,
        avgFill,
        ranges: deptRanges,
      });
    }
  }

  const totals: Totals = rows.reduce<Totals>(
    (acc, r) => {
      acc.dishAmount += getNum(r, DISH_KEYS);
      acc.dishSum += getNum(r, SUM_KEYS);
      acc.uniqOrderId += getNum(r, ORDER_KEYS);
      return acc;
    },
    { dishAmount: 0, dishSum: 0, uniqOrderId: 0 }
  );

  return { tableRows, totals, ranges: null };
}

function formatCurrency(value: number): string {
  if (value === 0 && 1 / value < 0) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, precision = 2): string {
  if (value === undefined || value === null) return '—';
  return Number(value).toFixed(precision);
}

const RADIAN = Math.PI / 180;

function renderDeptPieLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, точка } = props;
  if (!percent || percent < 0.08) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.12;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const label = (точка || '') as string;
  if (!label) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor={x >= cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fill: 'var(--premium-muted)', fontSize: 11, fontWeight: 500 }}
    >
      {`${label} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function renderPayTypePieLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
  if (!percent || percent < 0.08) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.12;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (!name) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor={x >= cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fill: 'var(--premium-muted)', fontSize: 11, fontWeight: 500 }}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

/** Уровень в диапазоне 0..1 (0 = min, 1 = max). Для условного форматирования значками. */
function getValueLevel(value: number, min: number, max: number): number | null {
  if (value === 0 || min === max) return null;
  const n = (value - min) / (max - min);
  return Math.max(0, Math.min(1, n));
}

/** Угол поворота стрелки в градусах: 0 = вверх (max), 180 = вниз (min). */
function getIconAngle(level: number): number {
  return 180 - level * 180;
}

/** Рендер ячейки с значком-стрелкой по уровню в диапазоне (без заливки). */
function renderCellWithIcon(
  value: number,
  record: TableRow,
  dataKey: keyof TableRow,
  formatter: (v: number) => ReactNode,
): ReactNode {
  if (record.type === 'group') return formatter(value);
  const ranges = record.ranges as Record<string, { min: number; max: number }> | undefined;
  const range = ranges?.[dataKey as string];
  if (!range || value == null) return formatter(value);
  const level = getValueLevel(Number(value), range.min, range.max);
  if (level == null) return formatter(value);
  const angle = getIconAngle(level);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {formatter(value)}
      <ArrowUpOutlined
        style={{
          fontSize: 12,
          color: level >= 0.6 ? '#34d399' : level <= 0.4 ? '#f87171' : 'var(--premium-muted)',
          transform: `rotate(${angle}deg)`,
          flexShrink: 0,
        }}
      />
    </span>
  );
}

function formatDateForOlap(d: dayjs.Dayjs): string {
  return d.format('DD.MM.YYYY');
}

/** DD.MM.YYYY → YYYY-MM-DD для хранения в БД. */
function olapDateToIso(olapDate: string): string {
  const [d, m, y] = olapDate.trim().split('.');
  if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return olapDate;
}

/** Если в ответе iiko нет rowFields/aggregateFields, подставляем те же поля, что отправляли в запросе. */
function normalizeOlapRows(
  rowsArr: unknown[],
  data: Record<string, unknown>,
  fallbackColumns?: { rowFields: string[]; aggregateFields: string[] }
): SalesRow[] {
  if (rowsArr.length === 0) return [];
  const first = rowsArr[0];
  if (!Array.isArray(first)) return rowsArr as SalesRow[];

  const report = (data.report ?? data) as Record<string, unknown>;
  const rowFields = (report.rowFields ?? report.groupByRowFields ?? report.rowDimensions) as string[] | undefined;
  const aggFields = (report.aggregateFields ?? report.measures ?? report.columnIds) as string[] | undefined;
  let columns: string[] | null = Array.isArray(rowFields) && Array.isArray(aggFields)
    ? [...rowFields, ...aggFields]
    : Array.isArray(rowFields)
      ? rowFields
      : Array.isArray(aggFields)
        ? aggFields
        : null;

  if ((!columns || columns.length === 0) && fallbackColumns) {
    const rowFields = fallbackColumns.rowFields;
    const aggFields = fallbackColumns.aggregateFields;
    // iiko может вернуть строки в другом порядке (напр. Department, YearOpen, Mounth). Определяем по первой строке.
    if (rowFields.length >= 3 && Array.isArray(first) && first.length >= 3) {
      const a = first[0]; const b = first[1]; const c = first[2];
      const looksLikeYear = (v: unknown) => { const n = Number(v); return !Number.isNaN(n) && n >= 1900 && n <= 2100; };
      const looksLikeMonth = (v: unknown) => { const n = Number(v); return !Number.isNaN(n) && n >= 1 && n <= 12; };
      const isString = (v: unknown) => typeof v === 'string';
      if (isString(a) && looksLikeYear(b) && looksLikeMonth(c)) {
        columns = [rowFields[2], rowFields[0], rowFields[1], ...aggFields]; // [Department, YearOpen, Mounth]
      } else if (looksLikeYear(a) && looksLikeMonth(b) && isString(c)) {
        columns = [rowFields[0], rowFields[1], rowFields[2], ...aggFields]; // [YearOpen, Mounth, Department]
      } else if (looksLikeMonth(a) && looksLikeYear(b) && isString(c)) {
        columns = [rowFields[1], rowFields[0], rowFields[2], ...aggFields]; // [Mounth, YearOpen, Department]
      } else {
        columns = [...rowFields, ...aggFields];
      }
    } else {
      columns = [...rowFields, ...aggFields];
    }
  }

  let dataRows = rowsArr;
  if (!columns && first.every((c) => typeof c === 'string')) {
    columns = first as string[];
    dataRows = rowsArr.slice(1);
  }

  if (!columns || columns.length === 0) return rowsArr as SalesRow[];

  return dataRows.map((row) => {
    if (!Array.isArray(row)) return row as SalesRow;
    const obj: SalesRow = {};
    row.forEach((val, i) => {
      const key = columns![i] ?? `col_${i}`;
      obj[key] = val as string | number;
    });
    return obj;
  });
}

export default function SalesReportPage() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [olapSummary, setOlapSummary] = useState<SalesRow | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedPayTypes, setSelectedPayTypes] = useState<string[]>([]);
  const [payTypesList, setPayTypesList] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<SalesGroupBy>('week');
  /** Группировка, по которой построены текущие данные; обновляется только после «Сформировать отчёт». */
  const [groupByForData, setGroupByForData] = useState<SalesGroupBy>('week');
  const [paymentByType, setPaymentByType] = useState<{ name: string; value: number }[]>([]);
  const [departmentOrder, setDepartmentOrder] = useState<string[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<string>('');
  const [deliveryFlagList, setDeliveryFlagList] = useState<string[]>([]);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderModalList, setOrderModalList] = useState<string[]>([]);
  const [quickPeriod, setQuickPeriod] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!auth) return;
    (async () => {
      try {
        const settings = await getSettings(auth.token);
        if (settings.dateFrom && settings.dateTo) {
          form.setFieldsValue({
            dateFrom: dayjs(settings.dateFrom),
            dateTo: dayjs(settings.dateTo),
          });
        } else {
          form.setFieldsValue({
            dateFrom: dayjs().subtract(2, 'month'),
            dateTo: dayjs(),
          });
        }

        const loadedGroupBy: SalesGroupBy =
          settings.groupBy === 'day' || settings.groupBy === 'week' || settings.groupBy === 'month' || settings.groupBy === 'quarter'
            ? settings.groupBy
            : 'week';
        const loadedDeliveryFilter =
          typeof settings.deliveryFilter === 'string' ? settings.deliveryFilter : '';
        const loadedDepartments = Array.isArray(settings.selectedDepartments) ? settings.selectedDepartments : [];
        const loadedPayTypes = Array.isArray(settings.selectedPayTypes) ? settings.selectedPayTypes : [];
        const loadedDeptOrder = Array.isArray(settings.departmentOrder) ? settings.departmentOrder : [];

        setGroupBy(loadedGroupBy);
        setGroupByForData(loadedGroupBy);
        setSelectedDepartments(loadedDepartments);
        setSelectedPayTypes(loadedPayTypes);
        setDepartmentOrder(loadedDeptOrder);

        const flagList = await getDeliveryFlagValues(auth.token);
        setDeliveryFlagList(flagList);
        setDeliveryFilter(loadedDeliveryFilter);

        // После загрузки настроек сразу формируем отчёт с теми же фильтрами
        await runReport({
          groupByOverride: loadedGroupBy,
          deliveryFilterOverride: loadedDeliveryFilter,
          selectedDepartmentsOverride: loadedDepartments,
          selectedPayTypesOverride: loadedPayTypes,
        });
      } catch {
        form.setFieldsValue({
          dateFrom: dayjs().subtract(2, 'month'),
          dateTo: dayjs(),
        });
        // При ошибке настроек формируем отчёт с датами по умолчанию и текущими фильтрами
        await runReport();
      }
      getPayTypes(auth.token).then(setPayTypesList).catch(() => setPayTypesList([]));
      getDeliveryFlagValues(auth.token).then(setDeliveryFlagList).catch(() => setDeliveryFlagList([]));
    })();
  }, [auth]);

  const runReport = async (params?: {
    defaultDates?: { from: string; to: string };
    groupByOverride?: SalesGroupBy;
    deliveryFilterOverride?: string;
    selectedDepartmentsOverride?: string[];
    selectedPayTypesOverride?: string[];
  }) => {
    if (!auth) return;
    setError(null);
    setLoading(true);
    try {
      const effectiveGroupBy = params?.groupByOverride ?? groupBy;
      const effectiveDeliveryFilter = params?.deliveryFilterOverride ?? deliveryFilter;
      const effectiveSelectedDepartments = params?.selectedDepartmentsOverride ?? selectedDepartments;
      const effectiveSelectedPayTypes = params?.selectedPayTypesOverride ?? selectedPayTypes;

      let from: string;
      let to: string;
      if (params?.defaultDates?.from != null && params?.defaultDates?.to != null) {
        from = params.defaultDates.from;
        to = params.defaultDates.to;
      } else {
        const { dateFrom, dateTo } = await form.validateFields();
        from = formatDateForOlap(dateFrom);
        to = formatDateForOlap(dateTo);
      }
      const filters: Record<string, { filterType: 'IncludeValues'; values: string[] }> = {};
      if (effectiveSelectedPayTypes.length > 0) {
        filters.PayTypes = { filterType: 'IncludeValues', values: effectiveSelectedPayTypes };
      }
      // Поле Delivery.IsDelivery: значение из справочника (загружается из iiko на странице Справочники)
      if (effectiveDeliveryFilter && effectiveDeliveryFilter.trim()) {
        filters['Delivery.IsDelivery'] = { filterType: 'IncludeValues', values: [effectiveDeliveryFilter.trim()] };
      }
      const result = await fetchOlapReport(auth.token, {
        report: 'SALES',
        from,
        to,
        groupByRowFields: OLAP_GROUP_BY_ROW_FIELDS[effectiveGroupBy],
        aggregateFields: ['DishSumInt', 'GuestNum', 'DishAmountInt', 'UniqOrderId', 'DishDiscountSumInt.average', 'DishAmountInt.PerOrder'],
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      });

      if (result.raw) {
        setRows([]);
        setOlapSummary(null);
        setPaymentByType([]);
        setError('Ответ не в формате JSON. Убедитесь, что используется OLAP v2.');
        return;
      }

      const data = result.data as Record<string, unknown> | unknown[] | undefined;
      if (!data || typeof data !== 'object') {
        setRows([]);
        setOlapSummary(null);
        setPaymentByType([]);
        return;
      }
      let rowsArr: SalesRow[] = [];
      let summaryRow: SalesRow | null = null;
      if (Array.isArray(data)) {
        rowsArr = data as SalesRow[];
      } else {
        const obj = data as Record<string, unknown>;
        const report = obj.report as Record<string, unknown> | undefined;
        if (Array.isArray(obj.rows)) rowsArr = obj.rows as SalesRow[];
        else if (Array.isArray(obj.row)) rowsArr = obj.row as SalesRow[];
        else if (report && Array.isArray(report.rows)) rowsArr = report.rows as SalesRow[];
        else if (report && Array.isArray(report.row)) rowsArr = report.row as SalesRow[];
        else if (Array.isArray(obj.data)) rowsArr = obj.data as SalesRow[];
        else if (report && Array.isArray(report.data)) rowsArr = report.data as SalesRow[];
        rowsArr = normalizeOlapRows(rowsArr as unknown[], obj, {
          rowFields: OLAP_GROUP_BY_ROW_FIELDS[effectiveGroupBy],
          aggregateFields: ['DishSumInt', 'GuestNum', 'DishAmountInt', 'UniqOrderId', 'DishDiscountSumInt.average', 'DishAmountInt.PerOrder'],
        });
        summaryRow = (obj.summary ?? (report?.summary ?? null)) as SalesRow | null;
      }
      setRows(rowsArr);
      setOlapSummary(summaryRow && typeof summaryRow === 'object' ? summaryRow : null);
      setGroupByForData(effectiveGroupBy);

      // Отдельный запрос: оплаты по типам (для круговой диаграммы)
      try {
        const payResult = await fetchOlapReport(auth.token, {
          report: 'SALES',
          from,
          to,
          groupByRowFields: ['PayTypes'],
          aggregateFields: ['DishSumInt'],
          filters,
        });
        if (!payResult.raw && payResult.data && typeof payResult.data === 'object') {
          const payObj = payResult.data as Record<string, unknown>;
          const payReport = (payObj.report ?? payObj) as Record<string, unknown>;
          let payRows: unknown[] = [];
          if (Array.isArray(payObj.rows)) payRows = payObj.rows;
          else if (Array.isArray(payObj.row)) payRows = payObj.row;
          else if (payReport && Array.isArray(payReport.rows)) payRows = payReport.rows;
          else if (payReport && Array.isArray(payReport.row)) payRows = payReport.row;
          else if (Array.isArray(payObj.data)) payRows = payObj.data;
          const normalized = normalizeOlapRows(payRows as unknown[], payObj as Record<string, unknown>, {
            rowFields: ['PayTypes'],
            aggregateFields: ['DishSumInt'],
          });
          const PAY_KEYS = ['PayTypes', 'payTypes', 'PayType'];
          const SUM_KEYS_PAY = ['DishSumInt', 'dishSumInt', 'DishDiscountSumInt'];
          const list: { name: string; value: number }[] = normalized
            .map((r) => {
              const name = (getFirstVal(r, PAY_KEYS) ?? r.PayTypes ?? '—').toString().trim() || '—';
              const value = getNum(r, SUM_KEYS_PAY);
              return { name, value };
            })
            .filter((x) => x.value > 0)
            .sort((a, b) => b.value - a.value);
          setPaymentByType(list);
        } else {
          setPaymentByType([]);
        }
      } catch {
        setPaymentByType([]);
      }

      // Сохраняем фильтры в БД; подставляем текущие настройки с сервера, чтобы не затереть порядок точек
      const toSaveGroupBy = params?.groupByOverride ?? groupBy;
      const toSaveDeliveryFilter = effectiveDeliveryFilter;
      const toSaveDepartments = effectiveSelectedDepartments;
      const toSavePayTypes = effectiveSelectedPayTypes;
      getSettings(auth.token)
        .then((current) => ({
          ...(current && typeof current === 'object' ? current : {}),
          dateFrom: olapDateToIso(from),
          dateTo: olapDateToIso(to),
          groupBy: toSaveGroupBy,
          deliveryFilter: toSaveDeliveryFilter,
          selectedDepartments: toSaveDepartments.length > 0 ? toSaveDepartments : undefined,
          selectedPayTypes: toSavePayTypes.length > 0 ? toSavePayTypes : undefined,
        }))
        .then((merged) => saveSettings(auth.token, merged))
        .catch(() => {});
    } catch (e) {
      if (isTokenExpiredError(e)) {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setRows([]);
      setOlapSummary(null);
      setPaymentByType([]);
    } finally {
      setLoading(false);
    }
  };

  const { tableRows } = rows.length > 0
    ? aggregateByDepartmentAndPeriod(rows, groupByForData, departmentOrder.length > 0 ? departmentOrder : undefined)
    : { tableRows: [] as TableRow[] };

  const groupRows = tableRows.filter((r) => r.type === 'group');
  const departmentOptions = groupRows.map((r) => r.departmentKey);
  const filteredTableRows =
    selectedDepartments.length === 0
      ? tableRows
      : tableRows.filter((r) => selectedDepartments.includes(r.departmentKey));
  const filteredGroupRows = filteredTableRows.filter((r) => r.type === 'group');
  const footerDishAmount = filteredGroupRows.reduce((s, r) => s + Number(r.dishAmount) || 0, 0);
  const footerDishSum = filteredGroupRows.reduce((s, r) => s + Number(r.dishSum) || 0, 0);
  const footerUniqOrderId = filteredGroupRows.reduce((s, r) => s + Number(r.uniqOrderId) || 0, 0);
  const summaryAvgCheck = olapSummary != null ? getNum(olapSummary, AVG_CHECK_KEYS) : 0;
  const summaryAvgFill = olapSummary != null ? getNum(olapSummary, AVG_FILL_KEYS) : 0;
  const totalAvgCheck = summaryAvgCheck > 0 ? summaryAvgCheck : (footerUniqOrderId > 0 ? footerDishSum / footerUniqOrderId : 0);
  const totalAvgFill = summaryAvgFill > 0 ? summaryAvgFill : (footerUniqOrderId > 0 ? footerDishAmount / footerUniqOrderId : 0);
  const showAvgValues = footerUniqOrderId > 0 || totalAvgCheck > 0 || totalAvgFill > 0;

  const monthRows = tableRows.filter((r) => r.type === 'month');
  const byPeriod = new Map<string, { periodSortKey: string; dishSum: number; dishAmount: number; uniqOrderId: number; avgCheck: number; avgFill: number }>();
  const byPeriodByPoint = new Map<string, Map<string, number>>();
  monthRows.forEach((r) => {
    const sortKey = r.periodSortKey ?? r.period;
    const point = r.departmentKey;
    if (!byPeriod.has(sortKey)) byPeriod.set(sortKey, { periodSortKey: sortKey, dishSum: 0, dishAmount: 0, uniqOrderId: 0, avgCheck: 0, avgFill: 0 });
    const p = byPeriod.get(sortKey)!;
    p.dishSum += r.dishSum;
    p.dishAmount += r.dishAmount;
    p.uniqOrderId += r.uniqOrderId;
    if (!byPeriodByPoint.has(sortKey)) byPeriodByPoint.set(sortKey, new Map());
    const pointMap = byPeriodByPoint.get(sortKey)!;
    pointMap.set(point, (pointMap.get(point) ?? 0) + r.dishSum);
  });
  const chartMonthData = Array.from(byPeriod.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, p]) => ({
      period: formatPeriodLabel(p.periodSortKey, groupByForData),
      выручка: p.dishSum,
      чеков: p.uniqOrderId,
      блюд: p.dishAmount,
      среднийЧек: p.uniqOrderId > 0 ? p.dishSum / p.uniqOrderId : 0,
      наполняемость: p.uniqOrderId > 0 ? p.dishAmount / p.uniqOrderId : 0,
    }));
  const sortedPeriodKeys = Array.from(byPeriodByPoint.keys()).sort();
  const chartPointNames = groupRows.map((r) => r.departmentKey);
  const CHART_LINE_COLORS = ['#22d3ee', '#6366f1', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#2dd4bf', '#fb923c'];
  const chartMonthDataByPoint = sortedPeriodKeys.map((periodKey) => {
    const pointMap = byPeriodByPoint.get(periodKey)!;
    const row: Record<string, string | number> = {
      period: formatPeriodLabel(periodKey, groupByForData),
    };
    chartPointNames.forEach((name) => {
      row[name] = pointMap.get(name) ?? 0;
    });
    return row;
  });

  const chartDeptData = groupRows
    .map((r) => ({
      точка: r.department.replace(/^📁\s*/, ''),
      выручка: r.dishSum,
      чеков: r.uniqOrderId,
      среднийЧек: r.avgCheck,
      наполняемость: r.avgFill,
    }))
    .sort((a, b) => b.выручка - a.выручка);
  const totalDeptRevenue = chartDeptData.reduce((s, d) => s + (d.выручка ?? 0), 0);

  const sortedMonths = chartMonthData.map((d) => d.period);
  const prevMonthData =
    sortedMonths.length >= 2
      ? chartMonthData.find((d) => d.period === sortedMonths[sortedMonths.length - 2])
      : null;
  const lastMonthData = sortedMonths.length >= 1 ? chartMonthData.find((d) => d.period === sortedMonths[sortedMonths.length - 1]) : null;
  const totalLast = lastMonthData?.выручка ?? 0;
  const totalPrev = prevMonthData?.выручка ?? 0;
  const revenueChangePct = totalPrev > 0 ? ((totalLast - totalPrev) / totalPrev) * 100 : 0;

  function exportCsv() {
    const headers = ['Точка', 'Период', 'Кол-во блюд', 'Чеков', 'Выручка', 'Средний чек', 'Наполняемость'];
    const escape = (v: string | number) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v));
    const rows = filteredTableRows.map((r) =>
      [
        r.department || r.departmentKey,
        r.period,
        r.dishAmount,
        r.uniqOrderId,
        r.dishSum,
        r.avgCheck > 0 ? Math.round(r.avgCheck) : '',
        r.avgFill > 0 ? r.avgFill.toFixed(2) : '',
      ].map(escape).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: ColumnsType<TableRow> = [
    {
      title: 'Точка',
      dataIndex: 'department',
      key: 'department',
      width: 220,
      fixed: 'left',
      align: 'center',
      render: (val: string, record) =>
        record.type === 'group' ? <strong style={{ fontSize: 12 }}>{val}</strong> : val,
      onCell: (record) =>
        record.type === 'group' ? { style: { background: 'rgba(15,23,42,0.7)', fontWeight: 'bold' } } : {},
    },
    {
      title: 'Период',
      dataIndex: 'period',
      key: 'period',
      width: 100,
      align: 'center',
      render: (val: string, record) =>
        record.type === 'group' ? <em>{val}</em> : val,
      onCell: (record) =>
        record.type === 'group' ? { style: { background: 'rgba(15,23,42,0.7)', fontWeight: 'bold' } } : {},
    },
    {
      title: 'Кол-во блюд',
      dataIndex: 'dishAmount',
      key: 'dishAmount',
      width: 110,
      align: 'center',
      render: (val: number, record) => renderCellWithIcon(Number(val), record, 'dishAmount', (v) => formatNumber(v, 0)),
      onCell: (record) => (record.type === 'group' ? { style: { background: 'rgba(15,23,42,0.7)', fontWeight: 'bold' } } : {}),
    },
    {
      title: 'Чеков',
      dataIndex: 'uniqOrderId',
      key: 'uniqOrderId',
      width: 90,
      align: 'center',
      render: (val: number, record) => renderCellWithIcon(Number(val), record, 'uniqOrderId', (v) => v),
      onCell: (record) => (record.type === 'group' ? { style: { background: 'rgba(15,23,42,0.7)', fontWeight: 'bold' } } : {}),
    },
    {
      title: 'Выручка',
      dataIndex: 'dishSum',
      key: 'dishSum',
      width: 120,
      align: 'center',
      render: (val: number, record) => renderCellWithIcon(Number(val), record, 'dishSum', formatCurrency),
      onCell: (record) => (record.type === 'group' ? { style: { background: 'rgba(15,23,42,0.7)', fontWeight: 'bold' } } : {}),
    },
    {
      title: 'Средний чек',
      dataIndex: 'avgCheck',
      key: 'avgCheck',
      width: 120,
      align: 'center',
      render: (val: number, record) => (record.type === 'group' ? (val > 0 ? formatCurrency(val) : '—') : renderCellWithIcon(Number(val), record, 'avgCheck', (v) => (v > 0 ? formatCurrency(v) : '—'))),
      onCell: (record) => (record.type === 'group' ? { style: { background: 'rgba(15,23,42,0.7)', fontWeight: 'bold' } } : {}),
    },
    {
      title: 'Наполняемость чека',
      dataIndex: 'avgFill',
      key: 'avgFill',
      width: 140,
      align: 'center',
      render: (val: number, record) => (record.type === 'group' ? (val > 0 ? formatNumber(val, 2) : '—') : renderCellWithIcon(Number(val), record, 'avgFill', (v) => (v > 0 ? formatNumber(v, 2) : '—'))),
      onCell: (record) => (record.type === 'group' ? { style: { background: 'rgba(15,23,42,0.7)', fontWeight: 'bold' } } : {}),
    },
    {
      title: 'Доля %',
      key: 'share',
      width: 80,
      align: 'center',
      render: (_: unknown, record: TableRow) => {
        if (record.type !== 'group' || footerDishSum <= 0) return record.type === 'group' ? '—' : '';
        const pct = (record.dishSum / footerDishSum) * 100;
        return `${pct.toFixed(1)}%`;
      },
      onCell: (record) => (record.type === 'group' ? { style: { background: 'rgba(15,23,42,0.7)', fontWeight: 'bold' } } : {}),
    },
  ];

  if (!auth) {
    return (
      <Alert type="warning" message="Выполните вход" description="Перейдите на главную и войдите в сервер iiko." />
    );
  }

  return (
    <div style={{ maxWidth: '100%', width: '100%', margin: 0, padding: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
          padding: '20px 24px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--premium-border)',
          background: 'linear-gradient(145deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.4) 100%)',
          boxShadow: '0 0 0 1px rgba(148,163,184,0.1), 0 12px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
            boxShadow: '0 8px 24px rgba(34, 211, 238, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BarChartOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: 'var(--premium-text)', fontWeight: 700 }}>
            Отчёт по продажам
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--premium-muted)', fontSize: 13 }}>
            По точкам и периодам · выручка, чеки, средний чек
          </Typography.Text>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        {/* Основной контент — дашборд (KPI, графики, таблица) */}
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {tableRows.length > 0 && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="report-kpi-card report-kpi-revenue">
                <Statistic
                  title="Выручка за период"
                  value={footerDishSum}
                  formatter={(v) => formatCurrency(Number(v))}
                />
                <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  Сумма по выбранным точкам
                </Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="report-kpi-card report-kpi-orders">
                <Statistic title="Чеков" value={footerUniqOrderId} />
                <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  Количество заказов
                </Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="report-kpi-card report-kpi-avg">
                <Statistic title="Средний чек" value={totalAvgCheck} formatter={(v) => (Number(v) > 0 ? formatCurrency(Number(v)) : '—')} />
                <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  Выручка ÷ чеков
                </Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="report-kpi-card report-kpi-fill">
                <Statistic title="Наполняемость чека" value={totalAvgFill} precision={2} formatter={(v) => (Number(v) > 0 ? Number(v).toFixed(2) : '—')} />
                <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  Блюд в среднем на чек
                </Typography.Text>
              </Card>
            </Col>
          </Row>

          {lastMonthData && prevMonthData && (
            <Card size="small" className="report-dashboard-card" style={{ marginBottom: 24 }}>
              <Space size="middle" align="center" wrap>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: revenueChangePct >= 0 ? 'linear-gradient(135deg, #34d399 0%, #22c55e 100%)' : 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                  boxShadow: revenueChangePct >= 0 ? '0 8px 24px rgba(34, 197, 94, 0.35)' : '0 8px 24px rgba(239, 68, 68, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <RiseOutlined style={{ fontSize: 24, color: '#fff', transform: revenueChangePct < 0 ? 'rotate(180deg)' : undefined }} />
                </div>
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 2, color: 'var(--premium-text)' }}>Сравнение с предыдущим периодом</Typography.Text>
                  <Typography.Text style={{ fontSize: 18, fontWeight: 700, color: revenueChangePct >= 0 ? '#86efac' : '#fca5a5' }}>
                    {revenueChangePct >= 0 ? '+' : ''}{revenueChangePct.toFixed(1)}% выручки
                  </Typography.Text>
                  <Typography.Text style={{ display: 'block', fontSize: 12, color: 'var(--premium-muted)' }}>
                    {formatCurrency(totalPrev)} → {formatCurrency(totalLast)}
                  </Typography.Text>
                </div>
              </Space>
            </Card>
          )}

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={14}>
              <Card size="small" className="report-dashboard-card" title="Выручка по периодам (по точкам)" extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>Динамика по каждой точке</Typography.Text>} style={{ height: '100%' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartMonthDataByPoint} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: unknown) => `${(Number(v) / 1000).toFixed(0)}k`} stroke="#94a3b8" />
                    <Tooltip
                      content={({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
                        if (!active || !payload?.length || label == null) return null;
                        return (
                          <div className="sales-pie-tooltip-card">
                            <div className="sales-pie-tooltip-title">Период: {label}</div>
                            <div className="sales-pie-tooltip-body">
                              {payload.map((entry: any) => (
                                <div key={entry.dataKey ?? entry.name} className="sales-pie-tooltip-row">
                                  <span className="sales-pie-tooltip-label">{entry.name}</span>
                                  <span className="sales-pie-tooltip-value">{formatCurrency(Number(entry.value ?? 0))}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 8 }} iconType="line" iconSize={10} />
                    {chartPointNames.map((pointName, i) => (
                      <Line
                        key={pointName}
                        type="monotone"
                        dataKey={pointName}
                        name={pointName}
                        stroke={CHART_LINE_COLORS[i % CHART_LINE_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card size="small" className="report-dashboard-card sales-pie-card" title="Выручка по точкам" extra={<Typography.Text style={{ fontSize: 12, color: 'var(--premium-muted)' }}>Доля в выручке</Typography.Text>} style={{ height: '100%' }}>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                    <Pie
                      data={chartDeptData}
                      dataKey="выручка"
                      nameKey="точка"
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={112}
                      paddingAngle={4}
                      label={renderDeptPieLabel}
                      labelLine={{ strokeWidth: 1, stroke: 'rgba(148,163,184,0.5)' }}
                    >
                      <Label
                        content={({ viewBox }: { viewBox?: { cx?: number; cy?: number } }) =>
                          viewBox?.cx != null && viewBox?.cy != null ? (
                            <g>
                              <text x={viewBox.cx} y={viewBox.cy - 6} textAnchor="middle" className="sales-pie-center-label">
                                {formatCurrency(chartDeptData.reduce((s, d) => s + (d.выручка ?? 0), 0))}
                              </text>
                              <text x={viewBox.cx} y={viewBox.cy + 10} textAnchor="middle" className="sales-pie-center-sublabel">
                                Всего
                              </text>
                            </g>
                          ) : null
                        }
                        position="center"
                      />
                      {chartDeptData.map((_, i) => (
                        <Cell key={i} fill={CHART_LINE_COLORS[i % CHART_LINE_COLORS.length]} stroke="rgba(15,23,42,0.9)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload as { точка?: string; выручка?: number; чеков?: number; среднийЧек?: number; наполняемость?: number };
                        const pct = totalDeptRevenue > 0 && p.выручка != null ? ((p.выручка / totalDeptRevenue) * 100).toFixed(1) : '0';
                        return (
                          <div className="sales-pie-tooltip-card">
                            <div className="sales-pie-tooltip-title">{p.точка ?? '—'}</div>
                            <div className="sales-pie-tooltip-body">
                              <div className="sales-pie-tooltip-row">
                                <span className="sales-pie-tooltip-label">Выручка</span>
                                <span className="sales-pie-tooltip-value">{formatCurrency(p.выручка ?? 0)}</span>
                              </div>
                              <div className="sales-pie-tooltip-row">
                                <span className="sales-pie-tooltip-label">Доля от общей выручки</span>
                                <span className="sales-pie-tooltip-value">{pct}%</span>
                              </div>
                              <div className="sales-pie-tooltip-row">
                                <span className="sales-pie-tooltip-label">Чеков</span>
                                <span className="sales-pie-tooltip-value">{p.чеков ?? '—'}</span>
                              </div>
                              <div className="sales-pie-tooltip-row">
                                <span className="sales-pie-tooltip-label">Средний чек</span>
                                <span className="sales-pie-tooltip-value">{p.среднийЧек != null && p.среднийЧек > 0 ? formatCurrency(p.среднийЧек) : '—'}</span>
                              </div>
                              <div className="sales-pie-tooltip-row">
                                <span className="sales-pie-tooltip-label">Наполняемость чека</span>
                                <span className="sales-pie-tooltip-value">{p.наполняемость != null && p.наполняемость > 0 ? formatNumber(p.наполняемость, 2) : '—'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={14}>
              <Card size="small" className="report-dashboard-card" title="Средний чек и наполняемость по периодам" extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>Свод по всем точкам</Typography.Text>} style={{ height: '100%' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartMonthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickCount={6} allowDecimals={false} tickFormatter={(v: unknown) => (Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : String(Math.round(Number(v))))} stroke="#94a3b8" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      content={({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
                        if (!active || !payload?.length || label == null) return null;
                        const formatVal = (entry: { name?: string; value?: unknown }) =>
                          entry.name === 'Средний чек' ? formatCurrency(Number(entry.value ?? 0)) : Number(entry.value ?? 0).toFixed(2);
                        return (
                          <div className="sales-pie-tooltip-card">
                            <div className="sales-pie-tooltip-title">Период: {label}</div>
                            <div className="sales-pie-tooltip-body">
                              {payload.map((entry: any) => (
                                <div key={entry.dataKey ?? entry.name} className="sales-pie-tooltip-row">
                                  <span className="sales-pie-tooltip-label">{entry.name}</span>
                                  <span className="sales-pie-tooltip-value">{formatVal(entry)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 8 }} iconType="line" iconSize={10} />
                    <Line yAxisId="left" type="monotone" dataKey="среднийЧек" stroke="#22d3ee" name="Средний чек" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="наполняемость" stroke="#34d399" name="Наполняемость (блюд/чек)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card
                size="small"
                className="report-dashboard-card sales-pie-card"
                title="Оплаты по типам"
                extra={<Typography.Text style={{ fontSize: 12, color: 'var(--premium-muted)' }}>Выручка за период</Typography.Text>}
              >
                {paymentByType.length === 0 ? (
                  <Typography.Text style={{ color: 'var(--premium-muted)' }}>Нет данных</Typography.Text>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                      <Pie
                        data={paymentByType}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={112}
                        paddingAngle={4}
                        label={renderPayTypePieLabel}
                        labelLine={{ strokeWidth: 1, stroke: 'rgba(148,163,184,0.5)' }}
                      >
                        <Label
                          content={({ viewBox }: { viewBox?: { cx?: number; cy?: number } }) => {
                            const total = paymentByType.reduce((s, x) => s + x.value, 0);
                            return viewBox?.cx != null && viewBox?.cy != null ? (
                              <g>
                                <text x={viewBox.cx} y={viewBox.cy - 6} textAnchor="middle" className="sales-pie-center-label">
                                  {formatCurrency(total)}
                                </text>
                                <text x={viewBox.cx} y={viewBox.cy + 10} textAnchor="middle" className="sales-pie-center-sublabel">
                                  Всего
                                </text>
                              </g>
                            ) : null;
                          }}
                          position="center"
                        />
                        {paymentByType.map((_, i) => (
                          <Cell key={i} fill={CHART_LINE_COLORS[i % CHART_LINE_COLORS.length]} stroke="rgba(15,23,42,0.9)" strokeWidth={2} />
                        ))}
                      </Pie>
                    <Tooltip
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload as { name?: string; value?: number };
                          const total = paymentByType.reduce((s, x) => s + x.value, 0);
                          const pct = total > 0 && p.value != null ? ((p.value / total) * 100).toFixed(1) : '0';
                          return (
                            <div className="sales-pie-tooltip-card">
                              <div className="sales-pie-tooltip-title">{p.name ?? '—'}</div>
                              <div className="sales-pie-tooltip-body">
                                <div className="sales-pie-tooltip-row">
                                  <span className="sales-pie-tooltip-label">Выручка</span>
                                  <span className="sales-pie-tooltip-value">{formatCurrency(p.value ?? 0)}</span>
                                </div>
                                <div className="sales-pie-tooltip-row">
                                  <span className="sales-pie-tooltip-label">Доля от общей выручки</span>
                                  <span className="sales-pie-tooltip-value">{pct}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Card
        title={
          <Space wrap size="middle">
            <span style={{ fontWeight: 600, color: 'var(--premium-text)' }}>Таблица продаж</span>
            {tableRows.length > 0 && (
              <>
                <Typography.Text style={{ fontWeight: 'normal', fontSize: 12, color: 'var(--premium-muted)' }}>
                  {tableRows.filter((r) => r.type === 'group').length} точек
                </Typography.Text>
                <Select
                  mode="multiple"
                  placeholder="Фильтр по точкам"
                  value={selectedDepartments.length > 0 ? selectedDepartments : undefined}
                  onChange={(v) => setSelectedDepartments(v ?? [])}
                  options={departmentOptions.map((d) => ({ label: d, value: d }))}
                  style={{ minWidth: 200 }}
                  allowClear
                />
                <Button
                  icon={<UnorderedListOutlined />}
                  onClick={() => {
                    setOrderModalList([...departmentOptions]);
                    setOrderModalOpen(true);
                  }}
                  size="small"
                >
                  Порядок точек
                </Button>
                <Button type="primary" icon={<DownloadOutlined />} onClick={exportCsv} size="small">
                  Скачать CSV
                </Button>
              </>
            )}
          </Space>
        }
        className="report-dashboard-card sales-table-wrap"
        style={{ borderRadius: 'var(--radius-xl)' }}
      >
        <Table<TableRow>
          size="small"
          loading={loading}
          columns={columns}
          dataSource={filteredTableRows}
          pagination={false}
          scroll={{ x: 980 }}
          rowClassName={(record) => (record.type === 'group' ? 'report-group-row' : '')}
          className="report-sales-table"
          summary={
            filteredTableRows.length > 0
              ? () => (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="report-sales-summary-row">
                      <Table.Summary.Cell index={0} align="center" colSpan={1}>
                        Итог
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="center" colSpan={1} />
                      <Table.Summary.Cell index={2} align="center" colSpan={1}>
                        <strong>{formatNumber(footerDishAmount, 0)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="center" colSpan={1}>
                        <strong>{footerUniqOrderId}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="center" colSpan={1}>
                        <strong>{formatCurrency(footerDishSum)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="center" colSpan={1}>
                        <strong>{showAvgValues ? formatCurrency(totalAvgCheck) : '—'}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="center" colSpan={1}>
                        <strong>{showAvgValues ? formatNumber(totalAvgFill, 2) : '—'}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="center" colSpan={1}>
                        <strong>100%</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )
              : undefined
          }
        />
      </Card>
        </div>

        {/* Правый сайдбар — фильтры */}
        <div style={{ width: 336, flexShrink: 0, position: 'sticky', top: 24 }}>
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FilterOutlined style={{ fontSize: 18, color: 'var(--premium-accent)' }} />
                Параметры отчёта
              </span>
            }
            className="sales-filters-panel"
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={() => { setQuickPeriod(null); runReport(); }}
              initialValues={{ dateFrom: dayjs().subtract(2, 'month'), dateTo: dayjs() }}
            >
              <div className="sales-filters-section">
                <div className="sales-filters-section-label">
                  <CalendarOutlined /> Период
                </div>
                <div className="sales-quick-periods">
                  {[
                    { key: '7d', label: '7 дней', from: dayjs().subtract(6, 'day'), to: dayjs() },
                    { key: '1m', label: 'Месяц', from: dayjs().subtract(1, 'month'), to: dayjs() },
                    { key: '3m', label: '3 месяца', from: dayjs().subtract(3, 'month'), to: dayjs() },
                  ].map(({ key, label, from, to }) => (
                    <button
                      key={key}
                      type="button"
                      className={`sales-quick-period-chip ${quickPeriod === key ? 'active' : ''}`}
                      onClick={() => {
                        form.setFieldsValue({ dateFrom: from, dateTo: to });
                        setQuickPeriod(key);
                        runReport();
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Form.Item name="dateFrom" label="Дата с" rules={[{ required: true }]}>
                  <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="dateTo" label="По" rules={[{ required: true }]}>
                  <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div className="sales-filters-section">
                <div className="sales-filters-section-label">
                  <ApartmentOutlined /> Группировка
                </div>
                <Form.Item noStyle>
                  <Select<SalesGroupBy>
                    value={groupBy}
                    onChange={setGroupBy}
                    options={[
                      { value: 'month', label: 'По месяцам' },
                      { value: 'quarter', label: 'По кварталам' },
                      { value: 'week', label: 'По неделям' },
                      { value: 'day', label: 'По дням' },
                    ]}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
              <div className="sales-filters-section">
                <div className="sales-filters-section-label">
                  <CarOutlined /> Доставка
                </div>
                <Form.Item noStyle>
                  <Select
                    value={deliveryFilter}
                    onChange={(v) => setDeliveryFilter(v ?? '')}
                    placeholder="Все"
                    allowClear
                    options={[
                      { value: '', label: 'Все' },
                      ...deliveryFlagList.map((v) => ({ value: v, label: v })),
                    ]}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
              <div className="sales-filters-section">
                <div className="sales-filters-section-label">
                  <CreditCardOutlined /> Тип оплаты
                </div>
                <Form.Item noStyle>
                  <Select
                    mode="multiple"
                    placeholder="Все типы"
                    value={selectedPayTypes.length > 0 ? selectedPayTypes : undefined}
                    onChange={(v) => setSelectedPayTypes(v ?? [])}
                    options={payTypesList.map((p) => ({ label: p, value: p }))}
                    style={{ width: '100%' }}
                    allowClear
                  />
                </Form.Item>
              </div>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} icon={<ReloadOutlined />} block className="sales-filters-submit">
                  Сформировать отчёт
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </div>

      <Modal
        title="Порядок торговых предприятий"
        open={orderModalOpen}
        onCancel={() => setOrderModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setOrderModalOpen(false)}>
            Отмена
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={async () => {
              if (!auth) return;
              try {
                const settings = await getSettings(auth.token);
                await saveSettings(auth.token, { ...settings, departmentOrder: orderModalList });
                setDepartmentOrder(orderModalList);
                message.success('Порядок точек сохранён');
                setOrderModalOpen(false);
              } catch (e) {
                message.error(e instanceof Error ? e.message : 'Не удалось сохранить');
              }
            }}
          >
            Сохранить
          </Button>,
        ]}
        width={420}
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Задайте порядок точек в таблице и на графиках. Кнопки «Вверх» / «Вниз» меняют позицию.
        </Typography.Text>
        <List
          size="small"
          dataSource={orderModalList}
          renderItem={(item, index) => (
            <List.Item
              actions={[
                <Button
                  key="up"
                  type="text"
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={index === 0}
                  onClick={() => {
                    if (index <= 0) return;
                    const next = [...orderModalList];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    setOrderModalList(next);
                  }}
                />,
                <Button
                  key="down"
                  type="text"
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={index === orderModalList.length - 1}
                  onClick={() => {
                    if (index >= orderModalList.length - 1) return;
                    const next = [...orderModalList];
                    [next[index], next[index + 1]] = [next[index + 1], next[index]];
                    setOrderModalList(next);
                  }}
                />,
              ]}
            >
              {item}
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}
