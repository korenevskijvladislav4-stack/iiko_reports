import { useState, useEffect, useRef } from 'react';
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
import { ReloadOutlined, DownloadOutlined, UserOutlined, TrophyOutlined, FilterOutlined, CalendarOutlined, ApartmentOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchOlapReport, isTokenExpiredError } from '../api/client';

type OlapRow = Record<string, string | number>;

/** Поля из iiko fields.json: Cashier = Кассир, Department = Торговое предприятие */
const CASHIER_KEYS = ['Cashier', 'cashier'];
const DEPT_KEYS = ['Department', 'department'];
/** Выручка без скидки (DishSumInt) — единая база во всех отчётах */
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

export type CashierRow = {
  key: string;
  cashier: string;
  department: string;
  revenue: number;
  orders: number;
  dishAmount: number;
  avgCheck: number;
  sharePct: number;
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

export default function CashiersReportPage() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CashierRow[]>([]);
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

      const result = await fetchOlapReport(auth.token, {
        report: 'SALES',
        from,
        to,
        groupByRowFields: ['Cashier', 'Department'],
        aggregateFields: ['DishSumInt', 'UniqOrderId', 'DishAmountInt'],
      });

      if (currentId !== requestIdRef.current) return;

      if (result.raw) {
        setRows([]);
        setAllDepartments([]);
        setError('Ответ не в формате JSON. Убедитесь, что используется OLAP v2.');
        setLoading(false);
        return;
      }

      const data = result.data as Record<string, unknown> | undefined;
      if (!data || typeof data !== 'object') {
        setRows([]);
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

      const departments = new Set<string>();
      const cashierRows: CashierRow[] = [];

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

      setAllDepartments(Array.from(departments).sort());
      setRows(cashierRows);
    } catch (e) {
      if (currentId !== requestIdRef.current) return;
      if (isTokenExpiredError(e)) {
        logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setRows([]);
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

  const selectedDepts = Form.useWatch('departmentFilter', form) ?? [];
  const filteredRows = rows.filter((r) => {
    if (Array.isArray(selectedDepts) && selectedDepts.length > 0 && !selectedDepts.includes(r.department)) return false;
    return true;
  });

  const totalRevenue = filteredRows.reduce((s, x) => s + x.revenue, 0);
  const totalOrders = filteredRows.reduce((s, x) => s + x.orders, 0);
  const totalAvgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const columns: ColumnsType<CashierRow> = [
    {
      title: 'Кассир',
      dataIndex: 'cashier',
      key: 'cashier',
      fixed: 'left',
      width: 200,
      sorter: (a, b) => a.cashier.localeCompare(b.cashier),
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: 'Точка',
      dataIndex: 'department',
      key: 'department',
      width: 160,
      sorter: (a, b) => a.department.localeCompare(b.department),
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
      title: 'Чеков',
      dataIndex: 'orders',
      key: 'orders',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.orders - b.orders,
      render: (v: number) => v.toLocaleString('ru-RU'),
    },
    {
      title: 'Блюд',
      dataIndex: 'dishAmount',
      key: 'dishAmount',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.dishAmount - b.dishAmount,
      render: (v: number) => v.toLocaleString('ru-RU'),
    },
    {
      title: 'Средний чек',
      dataIndex: 'avgCheck',
      key: 'avgCheck',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.avgCheck - b.avgCheck,
      render: (v: number) => (v > 0 ? formatCurrency(v) : '—'),
    },
    {
      title: 'Доля %',
      dataIndex: 'sharePct',
      key: 'sharePct',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.sharePct - b.sharePct,
      render: (v: number) => `${v.toFixed(1)}%`,
    },
  ];

  function exportCsv() {
    const headers = ['Кассир', 'Точка', 'Выручка', 'Чеков', 'Блюд', 'Средний чек', 'Доля %'];
    const escape = (v: string | number) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v));
    const csvRows = filteredRows.map((r) =>
      [r.cashier, r.department, r.revenue, r.orders, r.dishAmount, r.avgCheck.toFixed(0), r.sharePct.toFixed(1)].map(escape).join(',')
    );
    const csv = [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashiers-report-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const topCashiers = [...filteredRows].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

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
          <UserOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: 'var(--premium-text)', fontWeight: 700 }}>
            Отчёт по кассирам
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--premium-muted)', fontSize: 13 }}>
            Выручка, чеки и средний чек по кассирам и точкам
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
                <Statistic title="Выручка" value={totalRevenue} formatter={(v) => formatCurrency(Number(v))} />
                <Typography.Text style={{ fontSize: 11, marginTop: 4, display: 'block', color: 'var(--premium-muted)' }}>
                  Сумма по выбранным точкам
                </Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="report-kpi-card report-kpi-orders">
                <Statistic title="Чеков" value={totalOrders} />
                <Typography.Text style={{ fontSize: 11, marginTop: 4, display: 'block', color: 'var(--premium-muted)' }}>
                  Количество заказов
                </Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="report-kpi-card report-kpi-avg">
                <Statistic
                  title="Средний чек"
                  value={totalAvgCheck}
                  formatter={(v) => (Number(v) > 0 ? formatCurrency(Number(v)) : '—')}
                />
                <Typography.Text style={{ fontSize: 11, marginTop: 4, display: 'block', color: 'var(--premium-muted)' }}>
                  Выручка ÷ чеков
                </Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small" className="report-kpi-card report-kpi-fill">
                <Statistic title="Кассиров в отчёте" value={filteredRows.length} />
                <Typography.Text style={{ fontSize: 11, marginTop: 4, display: 'block', color: 'var(--premium-muted)' }}>
                  Строк (кассир × точка)
                </Typography.Text>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} md={12}>
              <Card
                size="small"
                className="report-dashboard-card"
                title={<><TrophyOutlined style={{ marginRight: 6, color: 'var(--premium-accent)' }} /> Топ-5 кассиров по выручке</>}
                extra={<Typography.Text style={{ fontSize: 12, color: 'var(--premium-muted)' }}>Рейтинг за период</Typography.Text>}
                style={{ height: '100%' }}
              >
                {topCashiers.length === 0 ? (
                  <Typography.Text style={{ color: 'var(--premium-muted)' }}>Нет данных</Typography.Text>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {topCashiers.map((r, i) => {
                      const maxRev = topCashiers[0]?.revenue ?? 1;
                      const pct = maxRev > 0 ? (r.revenue / maxRev) * 100 : 0;
                      return (
                        <div key={r.key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--premium-text)' }}>
                              <span
                                style={{
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
                                }}
                              >
                                {i + 1}
                              </span>{' '}
                              {r.cashier} <Typography.Text style={{ fontSize: 12, color: 'var(--premium-muted)' }}>({r.department})</Typography.Text>
                            </span>
                            <Typography.Text strong style={{ color: 'var(--premium-text)' }}>{formatCurrency(r.revenue)}</Typography.Text>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: 'rgba(15,23,42,0.6)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #a78bfa, #6366f1)', transition: 'width 0.3s' }} />
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
                title="Выручка по точкам"
                extra={<Typography.Text style={{ fontSize: 12, color: 'var(--premium-muted)' }}>Свод по кассирам</Typography.Text>}
                style={{ height: '100%' }}
              >
                {(() => {
                  const byDept = new Map<string, number>();
                  filteredRows.forEach((r) => byDept.set(r.department, (byDept.get(r.department) ?? 0) + r.revenue));
                  const deptSorted = Array.from(byDept.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
                  const deptMax = deptSorted[0]?.[1] ?? 1;
                  return deptSorted.length === 0 ? (
                    <Typography.Text style={{ color: 'var(--premium-muted)' }}>Нет данных</Typography.Text>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      {deptSorted.map(([name, rev]) => {
                        const pct = (rev / deptMax) * 100;
                        return (
                          <div key={name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--premium-text)' }}>{name || '—'}</span>
                              <Typography.Text strong style={{ color: 'var(--premium-text)' }}>{formatCurrency(rev)}</Typography.Text>
                            </div>
                            <div style={{ height: 6, borderRadius: 3, background: 'rgba(15,23,42,0.6)', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #22d3ee, #6366f1)', transition: 'width 0.3s' }} />
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
                <span style={{ color: 'var(--premium-text)', fontWeight: 600 }}>Таблица по кассирам</span>
                {filteredRows.length > 0 && (
                  <>
                    <Typography.Text style={{ fontWeight: 'normal', fontSize: 13, color: 'var(--premium-muted)' }}>
                      {filteredRows.length} строк
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
            <Table<CashierRow>
              size="small"
              loading={loading}
              columns={columns}
              dataSource={filteredRows}
              pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
              scroll={{ x: 900 }}
              className="report-sales-table"
            />
          </Card>
        </>
      )}

      {!loading && rows.length === 0 && auth && (
        <Card className="report-dashboard-card" style={{ borderRadius: 14 }}>
          <Typography.Text style={{ color: 'var(--premium-muted)' }}>
            Нет данных за выбранный период или OLAP не вернул строк по кассирам. Используются поля Cashier и Department из iiko.
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
