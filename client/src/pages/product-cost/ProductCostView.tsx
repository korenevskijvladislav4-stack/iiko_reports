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
  CalculatorOutlined,
  CalendarOutlined,
  DownloadOutlined,
  FilterOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { productCostColumns, formatCurrency } from './constants';
import type { ProductCostRowWithKey, ProductCostTotals } from './types';

export interface ProductCostViewProps {
  error: string | null;
  onDismissError: () => void;
  onRetry?: () => void;
  isLoading: boolean;
  isEmpty: boolean;
  filteredCount: number;
  totals: ProductCostTotals;
  totalDepartmentSalary: number;
  tableRows: ProductCostRowWithKey[];
  onExportCsv: () => void;
  form: FormInstance;
  onFormFinish: () => void;
  quickPeriod: string | null;
  onQuickPeriodSelect: (key: string, from: Dayjs, to: Dayjs) => void;
  productGroupOptions: { label: string; value: string }[];
  productGroupFilter: string[];
  onProductGroupFilterChange: (value: string[]) => void;
  submitLoading?: boolean;
}

const QUICK_PERIODS: { key: string; label: string; from: () => Dayjs; to: () => Dayjs }[] = [
  { key: '7d', label: '7 дней', from: () => dayjs().subtract(6, 'day'), to: () => dayjs() },
  { key: '1m', label: 'Месяц', from: () => dayjs().startOf('month'), to: () => dayjs().endOf('month') },
  { key: '3m', label: '3 месяца', from: () => dayjs().subtract(3, 'month'), to: () => dayjs() },
];

function ProductCostViewComponent({
  error,
  onDismissError,
  onRetry,
  isLoading,
  isEmpty,
  filteredCount,
  totals,
  totalDepartmentSalary,
  tableRows,
  onExportCsv,
  form,
  onFormFinish,
  quickPeriod,
  onQuickPeriodSelect,
  productGroupOptions,
  productGroupFilter,
  onProductGroupFilterChange,
  submitLoading = false,
}: ProductCostViewProps) {
  return (
    <div style={{ maxWidth: '100%', width: '100%', margin: 0, padding: 0 }}>
      <div
        className="report-page-hero"
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
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            boxShadow: '0 8px 24px rgba(34, 197, 94, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CalculatorOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: 'var(--premium-text)', fontWeight: 700 }}>
            Формирование стоимости товара
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--premium-muted)', fontSize: 13 }}>
            Себестоимость из iiko, зарплата цеха по графикам и почасовая ставка, человеческая стоимость на единицу
          </Typography.Text>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          closable
          onClose={onDismissError}
          style={{ marginBottom: 16 }}
          action={onRetry ? <Button size="small" danger onClick={onRetry}>Повторить</Button> : undefined}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {filteredCount > 0 && (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="report-kpi-card report-kpi-fill">
                    <Statistic title="Позиций в отчёте" value={filteredCount} />
                    <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                      Строк в таблице
                    </Typography.Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="report-kpi-card report-kpi-cost">
                    <Statistic
                      title="Себестоимость из iiko"
                      value={totals.costFromIiko}
                      formatter={() => formatCurrency(totals.costFromIiko)}
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                      Сумма по отфильтрованным строкам
                    </Typography.Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="report-kpi-card report-kpi-margin">
                    <Statistic
                      title="Зарплата цехов"
                      value={totalDepartmentSalary}
                      formatter={() => formatCurrency(totalDepartmentSalary)}
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                      Единое значение за период
                    </Typography.Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="report-kpi-card report-kpi-orders">
                    <Statistic title="Продано единиц" value={totals.quantitySold} />
                    <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                      Количество проданных товаров
                    </Typography.Text>
                  </Card>
                </Col>
              </Row>

              <Card
                title={
                  <Space wrap size="middle">
                    <span style={{ fontWeight: 600, color: 'var(--premium-text)' }}>Таблица стоимости товара</span>
                    <Typography.Text style={{ fontWeight: 'normal', fontSize: 12, color: 'var(--premium-muted)' }}>
                      {filteredCount} позиций
                    </Typography.Text>
                    <Select
                      mode="multiple"
                      placeholder="Все группы"
                      value={productGroupFilter.length > 0 ? productGroupFilter : undefined}
                      onChange={(v) => onProductGroupFilterChange(v ?? [])}
                      options={productGroupOptions}
                      style={{ minWidth: 200 }}
                      allowClear
                    />
                    <Button type="primary" icon={<DownloadOutlined />} onClick={onExportCsv} size="small">
                      Скачать CSV
                    </Button>
                  </Space>
                }
                className="report-dashboard-card sales-table-wrap"
                style={{ borderRadius: 'var(--radius-xl)' }}
              >
                <Table<ProductCostRowWithKey>
                  size="small"
                  columns={productCostColumns}
                  dataSource={tableRows}
                  loading={isLoading}
                  pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
                  rowKey="key"
                  scroll={{ x: 1400 }}
                  className="report-sales-table"
                />
              </Card>
            </>
          )}

          {!isLoading && isEmpty && (
            <Card className="report-dashboard-card" style={{ borderRadius: 14 }}>
              <Typography.Text style={{ color: 'var(--premium-muted)' }}>
                Нет данных за выбранный период. Выберите период и нажмите «Сформировать отчёт».
              </Typography.Text>
            </Card>
          )}
        </div>

        <div style={{ width: 336, flexShrink: 0, position: 'sticky', top: 24 }}>
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--premium-text)', fontSize: 14, fontWeight: 600 }}>
                <FilterOutlined style={{ fontSize: 18, color: 'var(--premium-accent)' }} />
                Параметры отчёта
              </span>
            }
            className="sales-filters-panel"
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={onFormFinish}
              initialValues={{ dateFrom: dayjs().startOf('month'), dateTo: dayjs().endOf('month') }}
            >
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
                <div className="sales-filters-section-label"><FolderOutlined /> Группа товаров</div>
                <Select
                  mode="multiple"
                  placeholder="Все группы"
                  options={productGroupOptions}
                  allowClear
                  style={{ width: '100%' }}
                  value={productGroupFilter.length > 0 ? productGroupFilter : undefined}
                  onChange={(v) => onProductGroupFilterChange(v ?? [])}
                />
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  Фильтр по таблице (после формирования отчёта)
                </Typography.Text>
              </div>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={submitLoading} icon={<CalculatorOutlined />} block className="sales-filters-submit">
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

export const ProductCostView = React.memo(ProductCostViewComponent);
