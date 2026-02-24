import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Form,
  Alert,
  Typography,
  DatePicker,
  Select,
  Row,
  Col,
  Statistic,
  Space,
} from 'antd';
import { ReloadOutlined, DownloadOutlined, AppstoreOutlined, TrophyOutlined, FilterOutlined, CalendarOutlined, ApartmentOutlined, FolderOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchOlapReport, isTokenExpiredError } from '../api/client';

type OlapRow = Record<string, string | number>;

/** Поля из iiko fields.json: DishName = Блюдо, DishCategory = Категория блюда, Department = Торговое предприятие */
const DISH_KEYS = ['DishName', 'DishFullName', 'Dish', 'dish'];
const CATEGORY_KEYS = ['DishCategory', 'DishGroup', 'DishGroup.TopParent', 'Category', 'category'];
const DEPT_KEYS = ['Department', 'department'];
/** Выручка без скидки (DishSumInt) — единая база во всех отчётах */
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
  const columns: string[] = Array.isArray(rowFields) && Array.isArray(aggFields)
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

export type DishRow = {
  key: string;
  dish: string;
  category: string;
  department: string;
  amount: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
  sharePct: number;
  avgPrice: number;
  hasCost: boolean;
};

function formatCurrency(value: number): string {
  if (value === 0 && 1 / value < 0) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateForOlap(d: dayjs.Dayjs): string {
  return d.format('DD.MM.YYYY');
}

export default function DishesReportPage() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DishRow[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [quickPeriod, setQuickPeriod] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const runReport = async () => {
    if (!auth) return;
    const currentId = ++requestIdRef.current;
    setError(null);
    setLoading(true);
    try {
      const { dateFrom, dateTo } = await form.validateFields();
      const from = formatDateForOlap(dateFrom);
      const to = formatDateForOlap(dateTo);

      const result = await fetchOlapReport({
        serverUrl: auth.serverUrl,
        token: auth.token,
        report: 'SALES',
        from,
        to,
        groupByRowFields: ['DishName', 'DishCategory', 'Department'],
        aggregateFields: ['DishSumInt', 'DishAmountInt', 'ProductCostBase.ProductCost'],
      });

      if (currentId !== requestIdRef.current) return;

      if (result.raw) {
        setRows([]);
        setAllCategories([]);
        setAllDepartments([]);
        setError('Ответ не в формате JSON. Убедитесь, что используется OLAP v2.');
        setLoading(false);
        return;
      }

      const data = result.data as Record<string, unknown> | undefined;
      if (!data || typeof data !== 'object') {
        setRows([]);
        setAllCategories([]);
        setAllDepartments([]);
        setLoading(false);
        return;
      }

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
      const dishRows: DishRow[] = [];
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

      if (currentId !== requestIdRef.current) return;
      setAllCategories(Array.from(categories).sort());
      setAllDepartments(Array.from(departments).sort());
      setRows(dishRows);
    } catch (e) {
      if (currentId !== requestIdRef.current) return;
      if (isTokenExpiredError(e)) {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setRows([]);
      setAllCategories([]);
      setAllDepartments([]);
    } finally {
      if (currentId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (auth) {
      const dateFrom = dayjs().subtract(1, 'month');
      const dateTo = dayjs();
      form.setFieldsValue({ dateFrom, dateTo });
      runReport();
    }
  }, [auth]);

  const includeGroups = Form.useWatch('productGroupInclude', form) ?? [];
  const excludeGroups = Form.useWatch('productGroupExclude', form) ?? [];
  const selectedDepts = Form.useWatch('departmentFilter', form) ?? [];

  const filteredRows = rows.filter((r) => {
    if (Array.isArray(includeGroups) && includeGroups.length > 0 && !includeGroups.includes(r.category)) return false;
    if (Array.isArray(excludeGroups) && excludeGroups.length > 0 && excludeGroups.includes(r.category)) return false;
    if (Array.isArray(selectedDepts) && selectedDepts.length > 0 && !selectedDepts.includes(r.department)) return false;
    return true;
  });

  const allDishes = useMemo(() => [...new Set(rows.map((r) => r.dish))].sort(), [rows]);

  const totalRevenue = filteredRows.reduce((s, x) => s + x.revenue, 0);
  const totalCost = filteredRows.reduce((s, x) => s + x.cost, 0);
  const totalMargin = totalRevenue - totalCost;
  const hasAnyCost = filteredRows.some((x) => x.hasCost);

  const columns: ColumnsType<DishRow> = [
    {
      title: 'Блюдо',
      dataIndex: 'dish',
      key: 'dish',
      fixed: 'left',
      width: 220,
      sorter: (a, b) => a.dish.localeCompare(b.dish),
      render: (v: string) => <strong>{v}</strong>,
      filters: allDishes.map((d) => ({ text: d, value: d })),
      onFilter: (value, record) => record.dish === value,
      filterSearch: true,
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      width: 160,
      sorter: (a, b) => a.category.localeCompare(b.category),
      filters: allCategories.map((c) => ({ text: c, value: c })),
      onFilter: (value, record) => record.category === value,
      filterSearch: true,
    },
    {
      title: 'Точка',
      dataIndex: 'department',
      key: 'department',
      width: 140,
      sorter: (a, b) => a.department.localeCompare(b.department),
      filters: allDepartments.map((d) => ({ text: d, value: d })),
      onFilter: (value, record) => record.department === value,
      filterSearch: true,
    },
    {
      title: 'Кол-во',
      dataIndex: 'amount',
      key: 'amount',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (v: number) => v.toLocaleString('ru-RU'),
    },
    {
      title: 'Выручка',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 120,
      align: 'right',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.revenue - b.revenue,
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Себестоимость',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.cost - b.cost,
      render: (v: number) => (hasAnyCost ? formatCurrency(v) : '—'),
    },
    {
      title: 'Маржа',
      dataIndex: 'margin',
      key: 'margin',
      width: 110,
      align: 'right',
      sorter: (a, b) => a.margin - b.margin,
      render: (v: number) => (hasAnyCost ? formatCurrency(v) : '—'),
    },
    {
      title: 'Маржа %',
      dataIndex: 'marginPct',
      key: 'marginPct',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.marginPct - b.marginPct,
      render: (_: unknown, r: DishRow) => (r.hasCost ? `${r.marginPct.toFixed(1)}%` : '—'),
    },
    {
      title: 'Доля в выручке %',
      dataIndex: 'sharePct',
      key: 'sharePct',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.sharePct - b.sharePct,
      render: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      title: 'Средняя цена',
      dataIndex: 'avgPrice',
      key: 'avgPrice',
      width: 110,
      align: 'right',
      sorter: (a, b) => a.avgPrice - b.avgPrice,
      render: (v: number) => formatCurrency(v),
    },
  ];

  function exportCsv() {
    const headers = ['Блюдо', 'Категория', 'Точка', 'Кол-во', 'Выручка', 'Себестоимость', 'Маржа', 'Маржа %', 'Доля %', 'Средняя цена'];
    const escape = (v: string | number) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v));
    const csvRows = filteredRows.map((r) =>
      [
        r.dish,
        r.category,
        r.department,
        r.amount,
        r.revenue,
        hasAnyCost ? r.cost : '',
        hasAnyCost ? r.margin : '',
        hasAnyCost ? r.marginPct.toFixed(1) : '',
        r.sharePct.toFixed(1),
        r.avgPrice.toFixed(0),
      ].map(escape).join(',')
    );
    const csv = [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dishes-report-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!auth) {
    return (
      <Alert type="warning" message="Выполните вход" description="Перейдите на главную и войдите в сервер iiko." />
    );
  }

  const topDishes = [...filteredRows].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

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
          <AppstoreOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: 'var(--premium-text)', fontWeight: 700 }}>
            Отчёт по блюдам
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--premium-muted)', fontSize: 13 }}>
            Выручка, себестоимость, маржа · фильтр по категориям и точкам
          </Typography.Text>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>

      {filteredRows.length > 0 && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="report-kpi-card report-kpi-revenue">
                <Statistic
                  title="Выручка"
                  value={totalRevenue}
                  formatter={(v) => formatCurrency(Number(v))}
                />
                <Typography.Text style={{ fontSize: 11, marginTop: 4, display: 'block', color: 'var(--premium-muted)' }}>
                  Сумма по выбранным фильтрам
                </Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="report-kpi-card report-kpi-cost">
                <Statistic
                  title="Себестоимость"
                  value={totalCost}
                  formatter={(v) => (hasAnyCost ? formatCurrency(Number(v)) : '—')}
                />
                <Typography.Text style={{ fontSize: 11, marginTop: 4, display: 'block', color: 'var(--premium-muted)' }}>
                  Из учёта себестоимости в iiko
                </Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="report-kpi-card report-kpi-margin">
                <Statistic
                  title="Маржа"
                  value={totalMargin}
                  formatter={(v) => (hasAnyCost ? formatCurrency(Number(v)) : '—')}
                />
                <Typography.Text style={{ fontSize: 11, marginTop: 4, display: 'block', color: 'var(--premium-muted)' }}>
                  Выручка − себестоимость
                </Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="report-kpi-card report-kpi-fill">
                <Statistic title="Позиций в отчёте" value={filteredRows.length} />
                <Typography.Text style={{ fontSize: 11, marginTop: 4, display: 'block', color: 'var(--premium-muted)' }}>
                  Уникальных блюд (точка × категория)
                </Typography.Text>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} md={12}>
              <Card
                size="small"
                className="report-dashboard-card"
                title={<><TrophyOutlined style={{ marginRight: 6, color: 'var(--premium-accent)' }} /> Топ-5 блюд по выручке</>}
                extra={<Typography.Text style={{ fontSize: 12, color: 'var(--premium-muted)' }}>Рейтинг за период</Typography.Text>}
                style={{ height: '100%' }}
              >
                {topDishes.length === 0 ? (
                  <Typography.Text style={{ color: 'var(--premium-muted)' }}>Нет данных</Typography.Text>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {topDishes.map((r, i) => {
                      const maxRev = topDishes[0]?.revenue ?? 1;
                      const pct = maxRev > 0 ? (r.revenue / maxRev) * 100 : 0;
                      return (
                        <div key={r.key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--premium-text)' }}>
                              <span style={{
                                display: 'inline-block',
                                width: 20,
                                height: 20,
                                borderRadius: 6,
                                background: i === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : i === 1 ? 'rgba(148,163,184,0.4)' : i === 2 ? 'rgba(217,119,6,0.5)' : 'rgba(71,85,105,0.5)',
                                color: i === 0 ? '#1e293b' : 'var(--premium-text)',
                                textAlign: 'center',
                                lineHeight: '20px',
                                fontSize: 11,
                                fontWeight: 700,
                              }}>{i + 1}</span>
                              {' '}{r.dish}
                            </span>
                            <Typography.Text strong style={{ color: 'var(--premium-text)' }}>{formatCurrency(r.revenue)}</Typography.Text>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: 'rgba(15,23,42,0.6)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #22d3ee, #6366f1)', transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </Space>
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                size="small"
                className="report-dashboard-card"
                title="Выручка по категориям"
                extra={<Typography.Text style={{ fontSize: 12, color: 'var(--premium-muted)' }}>Топ категорий</Typography.Text>}
                style={{ height: '100%' }}
              >
                {(() => {
                  const byCat = new Map<string, number>();
                  filteredRows.forEach((r) => byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.revenue));
                  const catSorted = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
                  const catMax = catSorted[0]?.[1] ?? 1;
                  return catSorted.length === 0 ? (
                    <Typography.Text style={{ color: 'var(--premium-muted)' }}>Нет данных</Typography.Text>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      {catSorted.map(([name, rev]) => {
                        const pct = (rev / catMax) * 100;
                        return (
                          <div key={name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--premium-text)' }}>{name || '—'}</span>
                              <Typography.Text strong style={{ color: 'var(--premium-text)' }}>{formatCurrency(rev)}</Typography.Text>
                            </div>
                            <div style={{ height: 6, borderRadius: 3, background: 'rgba(15,23,42,0.6)', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #a78bfa, #6366f1)', transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        );
                      })}
                    </Space>
                  );
                })()}
              </Card>
            </Col>
          </Row>

          <Card
            title={
              <Space wrap align="center">
                <span style={{ color: 'var(--premium-text)', fontWeight: 600 }}>Таблица по блюдам</span>
                {filteredRows.length > 0 && (
                  <>
                    <Typography.Text style={{ fontWeight: 'normal', fontSize: 13, color: 'var(--premium-muted)' }}>
                      {filteredRows.length} позиций
                    </Typography.Text>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={exportCsv} size="small">
                      Скачать CSV
                    </Button>
                  </>
                )}
              </Space>
            }
            className="report-dashboard-card sales-table-wrap"
            style={{ borderRadius: 14 }}
          >
            <Table<DishRow>
              size="small"
              loading={loading}
              columns={columns}
              dataSource={filteredRows}
              pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
              scroll={{ x: 1200 }}
              className="report-sales-table"
            />
          </Card>
        </>
      )}

      {!loading && rows.length === 0 && auth && (
        <Card className="report-dashboard-card" style={{ borderRadius: 14 }}>
          <Typography.Text style={{ color: 'var(--premium-muted)' }}>
            Нет данных за выбранный период или OLAP не вернул строк по блюдам. Используются поля из iiko fields.json: DishName, DishCategory, Department.
          </Typography.Text>
        </Card>
      )}
        </div>

        <div style={{ width: 336, flexShrink: 0, position: 'sticky', top: 24 }}>
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--premium-text)', fontSize: 14, fontWeight: 600 }}>
                <FilterOutlined style={{ fontSize: 18, color: 'var(--premium-accent)' }} />
                Параметры отчёта
              </span>
            }
            className="sales-filters-panel"
            style={{ position: 'sticky', top: 24 }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={() => { setQuickPeriod(null); runReport(); }}
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
                  <ApartmentOutlined /> Точка
                </div>
                <Form.Item name="departmentFilter" noStyle>
                  <Select
                    mode="multiple"
                    placeholder="Все точки"
                    options={allDepartments.map((d) => ({ label: d, value: d }))}
                    allowClear
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
              <div className="sales-filters-section">
                <div className="sales-filters-section-label">
                  <FolderOutlined /> Только группы
                </div>
                <Form.Item name="productGroupInclude" noStyle>
                  <Select
                    mode="multiple"
                    placeholder="Включить группы"
                    options={allCategories.map((c) => ({ label: c, value: c }))}
                    allowClear
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
              <div className="sales-filters-section">
                <div className="sales-filters-section-label">
                  <FilterOutlined /> Исключить группы
                </div>
                <Form.Item name="productGroupExclude" noStyle>
                  <Select
                    mode="multiple"
                    placeholder="Исключить группы"
                    options={allCategories.map((c) => ({ label: c, value: c }))}
                    allowClear
                    style={{ width: '100%' }}
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
    </div>
  );
}
