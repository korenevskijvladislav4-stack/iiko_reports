import React from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FormInstance } from 'antd';
import { DatabaseOutlined, FilterOutlined, CalendarOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { StoreBalanceRowWithKey } from './types';

export interface StoreBalanceViewProps {
  error: string | null;
  onDismissError: () => void;
  onRetry?: () => void;
  isLoading: boolean;
  isEmpty: boolean;
  filteredCount: number;
  tableRows: StoreBalanceRowWithKey[];
  columns: ColumnsType<StoreBalanceRowWithKey>;
  onExportCsv: () => void;
  form: FormInstance;
  onFormFinish: () => void;
  quickPeriod: string | null;
  onQuickPeriodSelect: (key: string, from: Dayjs, to: Dayjs) => void;
  pointOptions: { label: string; value: string }[];
  pointFilter: string[];
  onPointFilterChange: (value: string[]) => void;
  groupOptions: { label: string; value: string }[];
  groupFilter: string[];
  onGroupFilterChange: (value: string[]) => void;
  submitLoading?: boolean;
}

const QUICK_PERIODS: { key: string; label: string; from: () => Dayjs; to: () => Dayjs }[] = [
  { key: '7d', label: '7 дней', from: () => dayjs().subtract(6, 'day'), to: () => dayjs() },
  { key: '1m', label: 'Месяц', from: () => dayjs().startOf('month'), to: () => dayjs().endOf('month') },
  { key: '3m', label: '3 месяца', from: () => dayjs().subtract(3, 'month'), to: () => dayjs() },
];

function StoreBalanceViewComponent({
  error,
  onDismissError,
  onRetry,
  isLoading,
  isEmpty,
  filteredCount,
  tableRows,
  columns,
  onExportCsv,
  form,
  onFormFinish,
  quickPeriod,
  onQuickPeriodSelect,
  pointOptions,
  pointFilter,
  onPointFilterChange,
  groupOptions,
  groupFilter,
  onGroupFilterChange,
  submitLoading = false,
}: StoreBalanceViewProps) {
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
            background: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
            boxShadow: '0 8px 24px rgba(34, 211, 238, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DatabaseOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: 'var(--premium-text)', fontWeight: 700 }}>
            Остатки по точкам (склады)
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--premium-muted)', fontSize: 13 }}>
            Точка (подразделение), товар и остаток на соответствующем складе по данным iiko.
          </Typography.Text>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message="Ошибка загрузки отчёта остатков"
          description={error}
          showIcon
          closable
          onClose={onDismissError}
          style={{ marginBottom: 16 }}
          action={onRetry ? <Button size="small" danger onClick={onRetry}>Повторить</Button> : undefined}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          <Card
            title={
              <Space wrap size="middle" align="center">
                <span style={{ fontWeight: 600, color: 'var(--premium-text)' }}>Таблица остатков</span>
                {filteredCount > 0 && (
                  <Typography.Text style={{ fontWeight: 'normal', fontSize: 12, color: 'var(--premium-muted)' }}>
                    {filteredCount} записей
                  </Typography.Text>
                )}
                {filteredCount > 0 && (
                  <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={onExportCsv}>
                    Скачать CSV
                  </Button>
                )}
              </Space>
            }
            className="report-dashboard-card sales-table-wrap"
            style={{ borderRadius: 'var(--radius-xl)' }}
          >
            <Table<StoreBalanceRowWithKey>
              size="small"
              loading={isLoading}
              columns={columns}
              dataSource={tableRows}
              pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
              scroll={{ x: 1300 }}
              rowKey="key"
              className="report-sales-table"
            />
          </Card>

          {!isLoading && isEmpty && (
            <Card className="report-dashboard-card" style={{ borderRadius: 14, marginTop: 16 }}>
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
              initialValues={{ dateFrom: dayjs().subtract(6, 'day'), dateTo: dayjs() }}
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
                <div className="sales-filters-section-label">Точка</div>
                <Select
                  mode="multiple"
                  placeholder="Все точки"
                  options={pointOptions}
                  allowClear
                  style={{ width: '100%' }}
                  value={pointFilter.length > 0 ? pointFilter : undefined}
                  onChange={(v) => onPointFilterChange(v ?? [])}
                />
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  Фильтр по таблице (после формирования отчёта)
                </Typography.Text>
              </div>
              <div className="sales-filters-section">
                <div className="sales-filters-section-label">Группа товаров</div>
                <Select
                  mode="multiple"
                  placeholder="Все группы"
                  options={groupOptions}
                  allowClear
                  style={{ width: '100%' }}
                  value={groupFilter.length > 0 ? groupFilter : undefined}
                  onChange={(v) => onGroupFilterChange(v ?? [])}
                />
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  Фильтр по таблице (после формирования отчёта)
                </Typography.Text>
              </div>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={submitLoading} block className="sales-filters-submit">
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

export const StoreBalanceView = React.memo(StoreBalanceViewComponent);
