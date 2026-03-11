import React, { useCallback } from 'react';
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
  TeamOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { departmentSalaryColumns, formatSalary } from './constants';
import type { DepartmentSalaryTableRow, DepartmentSalaryTotals } from './types';

export interface DepartmentSalaryViewProps {
  /** Ошибка API (показать Alert) */
  error: string | null;
  onDismissError: () => void;
  /** Повторить запрос при ошибке */
  onRetry?: () => void;
  /** Загрузка отчёта */
  isLoading: boolean;
  /** Нет данных после успешной загрузки */
  isEmpty: boolean;
  /** Количество отфильтрованных строк */
  filteredCount: number;
  /** Итоги */
  totals: DepartmentSalaryTotals;
  /** Данные таблицы (группы + сотрудники) */
  tableRows: DepartmentSalaryTableRow[];
  /** Экспорт в CSV */
  onExportCsv: () => void;
  /** Форма фильтров */
  form: FormInstance;
  onFormFinish: () => void;
  /** Быстрый период */
  quickPeriod: string | null;
  onQuickPeriodSelect: (key: string, from: Dayjs, to: Dayjs) => void;
  /** Фильтр подразделений */
  departmentOptions: { label: string; value: string }[];
  departmentFilter: string[];
  onDepartmentFilterChange: (value: string[]) => void;
  /** Кнопка «Сформировать отчёт» в состоянии загрузки */
  submitLoading?: boolean;
}

const QUICK_PERIODS: { key: string; label: string; from: () => Dayjs; to: () => Dayjs }[] = [
  { key: '7d', label: '7 дней', from: () => dayjs().subtract(6, 'day'), to: () => dayjs() },
  { key: '1m', label: 'Месяц', from: () => dayjs().startOf('month'), to: () => dayjs().endOf('month') },
  { key: '3m', label: '3 месяца', from: () => dayjs().subtract(3, 'month'), to: () => dayjs() },
];

function DepartmentSalaryViewComponent({
  error,
  onDismissError,
  onRetry,
  isLoading,
  isEmpty,
  filteredCount,
  totals,
  tableRows,
  onExportCsv,
  form,
  onFormFinish,
  quickPeriod,
  onQuickPeriodSelect,
  departmentOptions,
  departmentFilter,
  onDepartmentFilterChange,
  submitLoading = false,
}: DepartmentSalaryViewProps) {
  const renderTableSummary = useCallback(
    () =>
      tableRows.length > 0 ? (
        <Table.Summary fixed>
          <Table.Summary.Row className="report-sales-summary-row">
            <Table.Summary.Cell index={0} align="center">
              Итог
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="center" />
            <Table.Summary.Cell index={2} align="center" />
            <Table.Summary.Cell index={3} align="center" />
            <Table.Summary.Cell index={4} align="center">
              <strong>{totals.hours.toFixed(2).replace('.', ',')}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="center">
              <strong>{formatSalary(totals.salary)}</strong>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
      ) : undefined,
    [tableRows.length, totals.hours, totals.salary]
  );

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
          <TeamOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: 'var(--premium-text)', fontWeight: 700 }}>
            Зарплата подразделений
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--premium-muted)', fontSize: 13 }}>
            Подразделение, должность, сотрудники, отработанные часы и почасовая оплата по данным графика смен.
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
          action={
            onRetry ? (
              <Button size="small" danger onClick={onRetry}>
                Повторить
              </Button>
            ) : undefined
          }
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {filteredCount > 0 && (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={8}>
                  <Card size="small" className="report-kpi-card report-kpi-fill">
                    <Statistic title="Сотрудников в отчёте" value={filteredCount} />
                    <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                      Строк в таблице
                    </Typography.Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card size="small" className="report-kpi-card report-kpi-orders">
                    <Statistic title="Суммарные часы" value={totals.hours} precision={2} />
                    <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                      По всем сотрудникам
                    </Typography.Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card size="small" className="report-kpi-card report-kpi-cost">
                    <Statistic
                      title="Итого зарплата"
                      value={totals.salary}
                      formatter={() => formatSalary(totals.salary)}
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                      Затраты на персонал за период
                    </Typography.Text>
                  </Card>
                </Col>
              </Row>

              <Card
                title={
                  <Space wrap size="middle">
                    <span style={{ fontWeight: 600, color: 'var(--premium-text)' }}>
                      Таблица зарплаты по подразделениям
                    </span>
                    <Typography.Text style={{ fontWeight: 'normal', fontSize: 12, color: 'var(--premium-muted)' }}>
                      {filteredCount} сотрудников
                    </Typography.Text>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={onExportCsv} size="small">
                      Скачать CSV
                    </Button>
                  </Space>
                }
                className="report-dashboard-card sales-table-wrap"
                style={{ borderRadius: 'var(--radius-xl)' }}
              >
                <Table<DepartmentSalaryTableRow>
                  size="small"
                  columns={departmentSalaryColumns}
                  dataSource={tableRows}
                  loading={isLoading}
                  pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
                  rowKey="key"
                  scroll={{ x: 1100 }}
                  className="report-sales-table"
                  rowClassName={(record) => (record.type === 'group' ? 'report-group-row' : '')}
                  summary={renderTableSummary}
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
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--premium-text)',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
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
              initialValues={{
                dateFrom: dayjs().startOf('month'),
                dateTo: dayjs().endOf('month'),
              }}
            >
              <div className="sales-filters-section">
                <div className="sales-filters-section-label">
                  <CalendarOutlined /> Период
                </div>
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
                <div className="sales-filters-section-label">Подразделение</div>
                <Select
                  mode="multiple"
                  placeholder="Все"
                  options={departmentOptions}
                  allowClear
                  style={{ width: '100%' }}
                  value={departmentFilter.length > 0 ? departmentFilter : undefined}
                  onChange={(v) => onDepartmentFilterChange(v ?? [])}
                />
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  Фильтр по таблице (после формирования отчёта)
                </Typography.Text>
              </div>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitLoading}
                  icon={<CalculatorOutlined />}
                  block
                  className="sales-filters-submit"
                >
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

export const DepartmentSalaryView = React.memo(DepartmentSalaryViewComponent);
