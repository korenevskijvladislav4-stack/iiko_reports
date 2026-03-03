import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Typography, Select, Space, Alert, Form, DatePicker, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DatabaseOutlined, FilterOutlined, CalendarOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { useGetStoreBalanceReportMutation, useGetPointsQuery } from '../api/rtkApi';

type StoreBalanceRow = {
  key: string;
  pointName: string;
  productName: string | null;
  productGroup: string | null;
  amount: number;
  sum: number;
  totalSold: number;
  salesByDay: { date: string; quantitySold: number }[];
};

export default function StoreBalancePage() {
  const { auth } = useAuth();
  const [form] = Form.useForm();
  const [rawRows, setRawRows] = useState<StoreBalanceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [getReport, { isLoading }] = useGetStoreBalanceReportMutation();
  const { data: pointsList = [] } = useGetPointsQuery(undefined, { skip: !auth });
  const [pointFilter, setPointFilter] = useState<string[]>([]);
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [quickPeriod, setQuickPeriod] = useState<string | null>('7d');

  const runReport = async () => {
    if (!auth) return;
    setError(null);
    try {
      const { dateFrom: fromVal, dateTo: toVal } = form.getFieldsValue();
      const from = (fromVal ? dayjs(fromVal) : dayjs().subtract(6, 'day')).format('YYYY-MM-DD');
      const to = (toVal ? dayjs(toVal) : dayjs()).format('YYYY-MM-DD');
      const data = await getReport({ from, to }).unwrap();
      const mapped: StoreBalanceRow[] = data.map((r, i) => ({
        key: `${r.pointName}\t${r.storeId}\t${r.productId}\t${i}`,
        pointName: r.pointName,
        productName: r.productName,
        productGroup: r.productGroup,
        amount: r.amount,
        sum: r.sum,
        totalSold: r.totalSold ?? 0,
        salesByDay: Array.isArray(r.salesByDay) ? r.salesByDay : [],
      }));
      setRawRows(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось получить данные из iiko');
      setRawRows([]);
    } finally {
      setIsInitialLoaded(true);
    }
  };

  useEffect(() => {
    if (!auth || isInitialLoaded) return;
    const from = dayjs().subtract(6, 'day');
    const to = dayjs();
    form.setFieldsValue({
      dateFrom: from,
      dateTo: to,
    });
    void runReport();
  }, [auth, isInitialLoaded, form]);

  const rows: StoreBalanceRow[] = useMemo(
    () => rawRows,
    [rawRows],
  );

  const filteredRows = useMemo(
    () => {
      let res = rows;
      // Убираем строки без названия товара и без продаж за период
      res = res.filter((r) => {
        const hasName = typeof r.productName === 'string' && r.productName.trim().length > 0;
        const hasSales = (r.totalSold ?? 0) > 0;
        return hasName || hasSales;
      });
      if (pointFilter.length > 0) {
        res = res.filter((r) => pointFilter.includes(r.pointName));
      }
      if (groupFilter.length > 0) {
        res = res.filter((r) => r.productGroup && groupFilter.includes(r.productGroup));
      }
      return res;
    },
    [rows, pointFilter, groupFilter],
  );

  const exportCsv = () => {
    if (filteredRows.length === 0) return;
    const headers: string[] = [
      'Точка',
      'Товар',
      'Группа товаров',
      'Остаток',
      'Сумма по себестоимости',
      'Продано за период',
      ...dayKeys.map((d) => dayjs(d).format('DD.MM.YYYY')),
    ];
    const escape = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const csvRows = filteredRows.map((r) => {
      const base: (string | number)[] = [
        r.pointName,
        r.productName ?? '',
        r.productGroup ?? '',
        r.amount,
        r.sum,
        r.totalSold ?? 0,
      ];
      const perDays: (string | number)[] = dayKeys.map((date) => {
        const found = r.salesByDay.find((d) => d.date === date);
        return found ? found.quantitySold : 0;
      });
      return [...base, ...perDays].map(escape).join(',');
    });
    const csv = [headers.map(escape).join(','), ...csvRows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-balance-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allGroups = useMemo(
    () => Array.from(new Set(rows.map((r) => r.productGroup).filter((g): g is string => !!g))).sort(),
    [rows],
  );

  const dayKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      for (const d of r.salesByDay) {
        if (d.date) set.add(d.date);
      }
    }
    return Array.from(set).sort();
  }, [rows]);

  const columns: ColumnsType<StoreBalanceRow> = useMemo(() => {
    const base: ColumnsType<StoreBalanceRow> = [
      { title: 'Точка', dataIndex: 'pointName', key: 'pointName', width: 220, align: 'center' },
      {
        title: 'Товар',
        dataIndex: 'productName',
        key: 'productName',
        width: 260,
        align: 'center',
        render: (_: unknown, r) => r.productName || '—',
      },
      {
        title: 'Группа товаров',
        dataIndex: 'productGroup',
        key: 'productGroup',
        width: 200,
        align: 'center',
        render: (_: unknown, r) => r.productGroup || '—',
      },
      {
        title: 'Продано за период',
        dataIndex: 'totalSold',
        key: 'totalSold',
        width: 150,
        align: 'center',
        render: (v: number) => (v != null ? v.toLocaleString('ru-RU') : '—'),
      },
    ];

    const perDayCols: ColumnsType<StoreBalanceRow> = dayKeys.map((date) => ({
      title: dayjs(date).format('DD.MM'),
      dataIndex: `day-${date}`,
      key: `day-${date}`,
      width: 110,
      align: 'center',
      render: (_: unknown, r) => {
        const found = r.salesByDay.find((d) => d.date === date);
        return found ? found.quantitySold.toLocaleString('ru-RU') : '—';
      },
    }));

    const tail: ColumnsType<StoreBalanceRow> = [
      {
        title: 'Остаток',
        dataIndex: 'amount',
        key: 'amount',
        width: 120,
        align: 'center',
      },
      {
        title: 'Сумма по себестоимости',
        dataIndex: 'sum',
        key: 'sum',
        width: 180,
        align: 'center',
        render: (v: number) =>
          new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(v),
      },
    ];

    return [...base, ...perDayCols, ...tail];
  }, [dayKeys]);

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
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          <Card
            title={
              <Space wrap size="middle" align="center">
                <span style={{ fontWeight: 600, color: 'var(--premium-text)' }}>Таблица остатков</span>
                {filteredRows.length > 0 && (
                  <Typography.Text style={{ fontWeight: 'normal', fontSize: 12, color: 'var(--premium-muted)' }}>
                    {filteredRows.length} записей
                  </Typography.Text>
                )}
                {filteredRows.length > 0 && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={exportCsv}
                  >
                    Скачать CSV
                  </Button>
                )}
              </Space>
            }
            className="report-dashboard-card sales-table-wrap"
            style={{ borderRadius: 'var(--radius-xl)' }}
          >
            <Table<StoreBalanceRow>
              size="small"
              loading={isLoading}
              columns={columns}
              dataSource={filteredRows}
              pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
              scroll={{ x: 1300 }}
              rowKey="key"
              className="report-sales-table"
            />
          </Card>
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
                void runReport();
              }}
              initialValues={{
                dateFrom: dayjs().subtract(6, 'day'),
                dateTo: dayjs(),
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
                        void runReport();
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
                  Точка
                </div>
                <Select
                  mode="multiple"
                  placeholder="Все точки"
                  options={pointsList.map((p) => ({ label: p, value: p }))}
                  allowClear
                  style={{ width: '100%' }}
                  value={pointFilter.length > 0 ? pointFilter : undefined}
                  onChange={(v) => setPointFilter(v ?? [])}
                />
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  Фильтр по таблице (после формирования отчёта)
                </Typography.Text>
              </div>
              <div className="sales-filters-section">
                <div className="sales-filters-section-label">
                  Группа товаров
                </div>
                <Select
                  mode="multiple"
                  placeholder="Все группы"
                  options={allGroups.map((g) => ({ label: g, value: g }))}
                  allowClear
                  style={{ width: '100%' }}
                  value={groupFilter.length > 0 ? groupFilter : undefined}
                  onChange={(v) => setGroupFilter(v ?? [])}
                />
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  Фильтр по таблице (после формирования отчёта)
                </Typography.Text>
              </div>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={isLoading} block className="sales-filters-submit">
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

