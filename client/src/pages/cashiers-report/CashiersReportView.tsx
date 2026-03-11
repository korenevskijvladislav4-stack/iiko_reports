import React from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  UserOutlined,
  FilterOutlined,
  CalendarOutlined,
  ApartmentOutlined,
  DownloadOutlined,
  TrophyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { cashierColumns, formatCurrency } from './constants';
import type { CashierRow } from './types';

export interface CashiersReportViewProps {
  error: string | null;
  onDismissError: () => void;
  isLoading: boolean;
  isEmpty: boolean;
  filteredRows: CashierRow[];
  totalRevenue: number;
  totalOrders: number;
  totalAvgCheck: number;
  topCashiers: CashierRow[];
  onExportCsv: () => void;
  form: FormInstance;
  onFormFinish: () => void;
  quickPeriod: string | null;
  onQuickPeriodSelect: (key: string, from: Dayjs, to: Dayjs) => void;
  departmentOptions: { label: string; value: string }[];
  departmentFilter: string[];
  onDepartmentFilterChange: (value: string[]) => void;
}

const QUICK_PERIODS: { key: string; label: string; from: () => Dayjs; to: () => Dayjs }[] = [
  { key: '7d', label: '7 дней', from: () => dayjs().subtract(6, 'day'), to: () => dayjs() },
  { key: '1m', label: 'Месяц', from: () => dayjs().subtract(1, 'month'), to: () => dayjs() },
  { key: '3m', label: '3 месяца', from: () => dayjs().subtract(3, 'month'), to: () => dayjs() },
];

function CashiersReportViewComponent({
  error,
  onDismissError,
  isLoading,
  isEmpty,
  filteredRows,
  totalRevenue,
  totalOrders,
  totalAvgCheck,
  topCashiers,
  onExportCsv,
  form,
  onFormFinish,
  quickPeriod,
  onQuickPeriodSelect,
  departmentOptions,
  departmentFilter,
  onDepartmentFilterChange,
}: CashiersReportViewProps) {
  const byDept = React.useMemo(() => {
    const map = new Map<string, number>();
    filteredRows.forEach((r) => map.set(r.department, (map.get(r.department) ?? 0) + r.revenue));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredRows]);
  const deptMax = byDept[0]?.[1] ?? 1;

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
        <Alert type="error" message={error} closable onClose={onDismissError} style={{ marginBottom: 16 }} />
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
                    {byDept.length === 0 ? (
                      <Typography.Text style={{ color: 'var(--premium-muted)' }}>Нет данных</Typography.Text>
                    ) : (
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        {byDept.map(([name, rev]) => {
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
                    )}
                  </Card>
                </Col>
              </Row>

              <Card
                title={
                  <Space wrap align="center">
                    <span style={{ color: 'var(--premium-text)', fontWeight: 600 }}>Таблица по кассирам</span>
                    <Typography.Text style={{ fontWeight: 'normal', fontSize: 13, color: 'var(--premium-muted)' }}>
                      {filteredRows.length} строк
                    </Typography.Text>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={onExportCsv} size="small">
                      Скачать CSV
                    </Button>
                  </Space>
                }
                className="report-dashboard-card sales-table-wrap"
                style={{ borderRadius: 14 }}
              >
                <Table<CashierRow>
                  size="small"
                  loading={isLoading}
                  columns={cashierColumns}
                  dataSource={filteredRows}
                  pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
                  scroll={{ x: 900 }}
                  className="report-sales-table"
                />
              </Card>
            </>
          )}

          {!isLoading && isEmpty && (
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
            <Form form={form} layout="vertical" onFinish={onFormFinish}>
              <div className="sales-filters-section">
                <div className="sales-filters-section-label"><CalendarOutlined /> Период</div>
                <div className="sales-quick-periods">
                  {QUICK_PERIODS.map(({ key, label, from, to }) => (
                    <button
                      key={key}
                      type="button"
                      className={`sales-quick-period-chip ${quickPeriod === key ? 'active' : ''}`}
                      onClick={() => onQuickPeriodSelect(key, from(), to())}
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
                <div className="sales-filters-section-label"><ApartmentOutlined /> Точка</div>
                <Select
                  mode="multiple"
                  placeholder="Все точки"
                  options={departmentOptions}
                  allowClear
                  style={{ width: '100%' }}
                  value={departmentFilter.length > 0 ? departmentFilter : undefined}
                  onChange={(v) => onDepartmentFilterChange(v ?? [])}
                />
              </div>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={isLoading} icon={<ReloadOutlined />} block className="sales-filters-submit">
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

export const CashiersReportView = React.memo(CashiersReportViewComponent);
