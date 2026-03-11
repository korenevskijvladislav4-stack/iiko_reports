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
  AppstoreOutlined,
  FilterOutlined,
  CalendarOutlined,
  ApartmentOutlined,
  FolderOutlined,
  DownloadOutlined,
  TrophyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { formatCurrency } from './constants';
import type { DishRow } from './types';

export interface DishesReportViewProps {
  error: string | null;
  onDismissError: () => void;
  isLoading: boolean;
  isEmpty: boolean;
  filteredRows: DishRow[];
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  hasAnyCost: boolean;
  columns: import('antd/es/table').ColumnsType<DishRow>;
  topDishes: DishRow[];
  categoryRevenueTop: [string, number][];
  onExportCsv: () => void;
  form: FormInstance;
  onFormFinish: () => void;
  quickPeriod: string | null;
  onQuickPeriodSelect: (key: string, from: Dayjs, to: Dayjs) => void;
  departmentOptions: { label: string; value: string }[];
  productGroupFilterOptions: string[];
}

const QUICK_PERIODS: { key: string; label: string; from: () => Dayjs; to: () => Dayjs }[] = [
  { key: '7d', label: '7 дней', from: () => dayjs().subtract(6, 'day'), to: () => dayjs() },
  { key: '1m', label: 'Месяц', from: () => dayjs().subtract(1, 'month'), to: () => dayjs() },
  { key: '3m', label: '3 месяца', from: () => dayjs().subtract(3, 'month'), to: () => dayjs() },
];

function DishesReportViewComponent({
  error,
  onDismissError,
  isLoading,
  isEmpty,
  filteredRows,
  totalRevenue,
  totalCost,
  totalMargin,
  hasAnyCost,
  columns,
  topDishes,
  categoryRevenueTop,
  onExportCsv,
  form,
  onFormFinish,
  quickPeriod,
  onQuickPeriodSelect,
  departmentOptions,
  productGroupFilterOptions,
}: DishesReportViewProps) {
  const catMax = categoryRevenueTop[0]?.[1] ?? 1;

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
                                  {r.dish}
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
                    {categoryRevenueTop.length === 0 ? (
                      <Typography.Text style={{ color: 'var(--premium-muted)' }}>Нет данных</Typography.Text>
                    ) : (
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        {categoryRevenueTop.map(([name, rev]) => {
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
                    )}
                  </Card>
                </Col>
              </Row>

              <Card
                title={
                  <Space wrap align="center">
                    <span style={{ color: 'var(--premium-text)', fontWeight: 600 }}>Таблица по блюдам</span>
                    <Typography.Text style={{ fontWeight: 'normal', fontSize: 13, color: 'var(--premium-muted)' }}>
                      {filteredRows.length} позиций
                    </Typography.Text>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={onExportCsv} size="small">
                      Скачать CSV
                    </Button>
                  </Space>
                }
                className="report-dashboard-card sales-table-wrap"
                style={{ borderRadius: 14 }}
              >
                <Table<DishRow>
                  size="small"
                  loading={isLoading}
                  columns={columns}
                  dataSource={filteredRows}
                  pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
                  scroll={{ x: 1200 }}
                  className="report-sales-table"
                />
              </Card>
            </>
          )}

          {!isLoading && isEmpty && (
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
                <Form.Item name="departmentFilter" noStyle>
                  <Select
                    mode="multiple"
                    placeholder="Все точки"
                    options={departmentOptions}
                    allowClear
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
              <div className="sales-filters-section">
                <div className="sales-filters-section-label"><FolderOutlined /> Только группы</div>
                <Form.Item name="productGroupInclude" noStyle>
                  <Select
                    mode="multiple"
                    placeholder="Включить группы"
                    options={productGroupFilterOptions.map((c) => ({ label: c, value: c }))}
                    allowClear
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
              <div className="sales-filters-section">
                <div className="sales-filters-section-label"><FilterOutlined /> Исключить группы</div>
                <Form.Item name="productGroupExclude" noStyle>
                  <Select
                    mode="multiple"
                    placeholder="Исключить группы"
                    options={productGroupFilterOptions.map((c) => ({ label: c, value: c }))}
                    allowClear
                    style={{ width: '100%' }}
                  />
                </Form.Item>
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

export const DishesReportView = React.memo(DishesReportViewComponent);
