import { useState, useMemo, useEffect } from 'react';
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
} from 'antd';
import { ReloadOutlined, CalculatorOutlined, FilterOutlined, CalendarOutlined, FolderOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { useGetProductCostReportMutation, useGetProductGroupValuesQuery } from '../api/rtkApi';

export type ProductCostRow = {
  key: string;
  productGroup: string;
  product: string;
  quantitySold: number;
  costFromIiko: number;
  departmentSalary: number;
  humanCost: number;
  currentPriceFromIiko: number;
};

function formatCurrency(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export default function ProductCostPage() {
  const { auth } = useAuth();
  const [form] = Form.useForm();
  const [rows, setRows] = useState<ProductCostRow[]>([]);
  const [totalDepartmentSalary, setTotalDepartmentSalary] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [productGroupFilter, setProductGroupFilter] = useState<string[]>([]);
  const [quickPeriod, setQuickPeriod] = useState<string | null>(null);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  const [getReport, { isLoading: loading }] = useGetProductCostReportMutation();
  const { data: productGroupOptions = [] } = useGetProductGroupValuesQuery(undefined, { skip: !auth });

  const runReport = async () => {
    if (!auth) return;
    setError(null);
    try {
      const { dateFrom: fromVal, dateTo: toVal } = form.getFieldsValue();
      const from = (fromVal ? dayjs(fromVal) : dayjs().startOf('month')).format('YYYY-MM-DD');
      const to = (toVal ? dayjs(toVal) : dayjs().endOf('month')).format('YYYY-MM-DD');
      const { rows: data, totalDepartmentSalary: totalSalary } = await getReport({ from, to }).unwrap();
      setTotalDepartmentSalary(totalSalary);
      setRows(
        data.map((r, i) => ({
          key: `${r.productGroup}\t${r.product}\t${i}`,
          productGroup: r.productGroup,
          product: r.product,
          quantitySold: r.quantitySold,
          costFromIiko: r.costFromIiko,
          departmentSalary: r.departmentSalary,
          humanCost: r.humanCost,
          currentPriceFromIiko: r.currentPriceFromIiko ?? 0,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки отчёта');
      setRows([]);
      setTotalDepartmentSalary(0);
    }
    setIsInitialLoaded(true);
  };

  useEffect(() => {
    if (!auth || isInitialLoaded) return;
    // по умолчанию берём последний месяц (как раньше initialValues)
    form.setFieldsValue({
      dateFrom: dayjs().startOf('month'),
      dateTo: dayjs().endOf('month'),
    });
    void runReport();
  }, [auth, isInitialLoaded, form]);

  const filteredRows = useMemo(() => {
    if (productGroupFilter.length === 0) return rows;
    return rows.filter((r) => productGroupFilter.includes(r.productGroup));
  }, [rows, productGroupFilter]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => ({
        count: acc.count + 1,
        costFromIiko: acc.costFromIiko + r.costFromIiko,
        departmentSalary: acc.departmentSalary + r.departmentSalary,
        quantitySold: acc.quantitySold + r.quantitySold,
      }),
      { count: 0, costFromIiko: 0, departmentSalary: 0, quantitySold: 0 }
    );
  }, [filteredRows]);

  const columns: ColumnsType<ProductCostRow> = [
    { title: 'Группа товаров', dataIndex: 'productGroup', key: 'productGroup', width: 180, ellipsis: true, align: 'center' },
    { title: 'Товар', dataIndex: 'product', key: 'product', width: 220, ellipsis: true, align: 'center' },
    {
      title: 'Кол-во проданных',
      dataIndex: 'quantitySold',
      key: 'quantitySold',
      width: 140,
      align: 'center',
      render: (v: number) => v.toLocaleString('ru-RU'),
    },
    {
      title: 'Себестоимость из iiko',
      dataIndex: 'costFromIiko',
      key: 'costFromIiko',
      width: 140,
      align: 'center',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Себестоимость единицы',
      key: 'unitCost',
      width: 140,
      align: 'center',
      render: (_: unknown, r: ProductCostRow) =>
        r.quantitySold > 0 ? formatCurrency(r.costFromIiko / r.quantitySold, 2) : '—',
    },
    {
      title: 'Зарплата цеха',
      dataIndex: 'departmentSalary',
      key: 'departmentSalary',
      width: 120,
      align: 'center',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Человеческая стоимость',
      dataIndex: 'humanCost',
      key: 'humanCost',
      width: 150,
      align: 'center',
      render: (v: number) => formatCurrency(v, 2),
    },
    {
      title: 'Себестоимость ед. + человеч.',
      key: 'unitCostPlusHuman',
      width: 180,
      align: 'center',
      render: (_: unknown, r: ProductCostRow) => {
        const unitCost = r.quantitySold > 0 ? r.costFromIiko / r.quantitySold : 0;
        return formatCurrency(unitCost + r.humanCost, 2);
      },
    },
    {
      title: 'Текущая стоимость из iiko',
      dataIndex: 'currentPriceFromIiko',
      key: 'currentPriceFromIiko',
      width: 160,
      align: 'center',
      render: (v: number) => (v != null && v > 0 ? formatCurrency(v, 2) : '—'),
    },
    {
      title: 'Разница (цена − себестоимость ед.)',
      key: 'priceMinusCost',
      width: 200,
      align: 'center',
      render: (_: unknown, r: ProductCostRow) => {
        const unitCost = r.quantitySold > 0 ? r.costFromIiko / r.quantitySold : 0;
        const fullCost = unitCost + r.humanCost;
        const price = r.currentPriceFromIiko ?? 0;
        if (price <= 0) return '—';
        const diff = price - fullCost;
        return formatCurrency(diff, 2);
      },
    },
  ];

  const exportCsv = () => {
    const headers = ['Группа товаров', 'Товар', 'Кол-во проданных', 'Себестоимость из iiko', 'Себестоимость единицы', 'Зарплата цеха', 'Человеческая стоимость', 'Себестоимость ед. + человеч.', 'Текущая стоимость из iiko', 'Разница (цена − себестоимость ед.)'];
    const escape = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const csvRows = filteredRows.map((r) => {
      const unitCost = r.quantitySold > 0 ? r.costFromIiko / r.quantitySold : 0;
      const unitPlusHuman = unitCost + r.humanCost;
      const price = r.currentPriceFromIiko ?? 0;
      const diff = price > 0 ? price - unitPlusHuman : '';
      return [r.productGroup, r.product, r.quantitySold, r.costFromIiko, unitCost.toFixed(2), r.departmentSalary, r.humanCost.toFixed(2), unitPlusHuman.toFixed(2), r.currentPriceFromIiko, typeof diff === 'number' ? diff.toFixed(2) : diff].map(escape).join(',');
    });
    const csv = [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-cost-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!auth) {
    return (
      <Alert type="warning" message="Выполните вход" description="Перейдите на главную и войдите в сервер iiko." />
    );
  }

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
        <Alert type="error" message={error} closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {filteredRows.length > 0 && (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" className="report-kpi-card report-kpi-fill">
                    <Statistic title="Позиций в отчёте" value={filteredRows.length} />
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
                      {filteredRows.length} позиций
                    </Typography.Text>
                    <Select
                      mode="multiple"
                      placeholder="Все группы"
                      value={productGroupFilter.length > 0 ? productGroupFilter : undefined}
                      onChange={(v) => setProductGroupFilter(v ?? [])}
                      options={[...new Set([...productGroupOptions, ...rows.map((r) => r.productGroup)])].map((g) => ({ label: g, value: g }))}
                      style={{ minWidth: 200 }}
                      allowClear
                    />
                    <Button type="primary" icon={<DownloadOutlined />} onClick={exportCsv} size="small">
                      Скачать CSV
                    </Button>
                  </Space>
                }
                className="report-dashboard-card sales-table-wrap"
                style={{ borderRadius: 'var(--radius-xl)' }}
              >
                <Table<ProductCostRow>
                  size="small"
                  columns={columns}
                  dataSource={filteredRows}
                  loading={loading}
                  pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
                  rowKey="key"
                  scroll={{ x: 1400 }}
                  className="report-sales-table"
                />
              </Card>
            </>
          )}

          {!loading && rows.length === 0 && auth && (
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
              onFinish={() => {
                setQuickPeriod(null);
                runReport();
              }}
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
                  {[
                    { key: '7d', label: '7 дней', from: dayjs().subtract(6, 'day'), to: dayjs() },
                    { key: '1m', label: 'Месяц', from: dayjs().startOf('month'), to: dayjs().endOf('month') },
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
                  <FolderOutlined /> Группа товаров
                </div>
                <Select
                  mode="multiple"
                  placeholder="Все группы"
                  options={productGroupOptions.map((g) => ({ label: g, value: g }))}
                  allowClear
                  style={{ width: '100%' }}
                  value={productGroupFilter.length > 0 ? productGroupFilter : undefined}
                  onChange={(v) => setProductGroupFilter(v ?? [])}
                />
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  Фильтр по таблице (после формирования отчёта)
                </Typography.Text>
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
