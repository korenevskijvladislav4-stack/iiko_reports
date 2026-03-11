import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Alert } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useCashiersReport } from './hooks';
import { CashiersReportView } from './CashiersReportView';
import type { CashierRow } from './types';

function formatDateForOlap(d: Dayjs): string {
  return d.format('DD.MM.YYYY');
}

function exportToCsv(rows: CashierRow[], filename: string): void {
  if (rows.length === 0) return;
  const headers = ['Кассир', 'Точка', 'Выручка', 'Чеков', 'Блюд', 'Средний чек', 'Доля %'];
  const escape = (v: string | number) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v));
  const csvRows = rows.map((r) =>
    [r.cashier, r.department, r.revenue, r.orders, r.dishAmount, r.avgCheck.toFixed(0), r.sharePct.toFixed(1)].map(escape).join(',')
  );
  const csv = [headers.join(','), ...csvRows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CashiersReportPage() {
  const { auth } = useAuth();
  const [form] = Form.useForm();
  const [quickPeriod, setQuickPeriod] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);

  const { rows, allDepartments, isLoading, error, runReport } = useCashiersReport({ enabled: !!auth });

  const filteredRows = useMemo(() => {
    if (departmentFilter.length === 0) return rows;
    return rows.filter((r) => departmentFilter.includes(r.department));
  }, [rows, departmentFilter]);

  const totalRevenue = useMemo(() => filteredRows.reduce((s, x) => s + x.revenue, 0), [filteredRows]);
  const totalOrders = useMemo(() => filteredRows.reduce((s, x) => s + x.orders, 0), [filteredRows]);
  const totalAvgCheck = useMemo(() => (totalOrders > 0 ? totalRevenue / totalOrders : 0), [totalRevenue, totalOrders]);
  const topCashiers = useMemo(() => [...filteredRows].sort((a, b) => b.revenue - a.revenue).slice(0, 5), [filteredRows]);

  useEffect(() => {
    if (!auth) return;
    form.setFieldsValue({ dateFrom: dayjs().subtract(1, 'month'), dateTo: dayjs() });
    runReport(formatDateForOlap(dayjs().subtract(1, 'month')), formatDateForOlap(dayjs()));
  }, [auth]);

  const handleFormFinish = useCallback(async () => {
    const { dateFrom, dateTo } = await form.validateFields();
    const from = formatDateForOlap(dateFrom ?? dayjs().subtract(1, 'month'));
    const to = formatDateForOlap(dateTo ?? dayjs());
    setQuickPeriod(null);
    await runReport(from, to);
  }, [form, runReport]);

  const handleQuickPeriodSelect = useCallback(
    async (key: string, from: Dayjs, to: Dayjs) => {
      form.setFieldsValue({ dateFrom: from, dateTo: to });
      setQuickPeriod(key);
      await runReport(formatDateForOlap(from), formatDateForOlap(to));
    },
    [form, runReport]
  );

  const handleExportCsv = useCallback(() => {
    exportToCsv(filteredRows, `cashiers-report-${dayjs().format('YYYY-MM-DD')}.csv`);
  }, [filteredRows]);

  const departmentOptions = useMemo(
    () => allDepartments.map((d) => ({ label: d, value: d })),
    [allDepartments]
  );

  if (!auth) {
    return (
      <Alert type="warning" message="Выполните вход" description="Перейдите на главную и войдите в сервер iiko." />
    );
  }

  return (
    <CashiersReportView
      error={error}
      onDismissError={() => {}}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      filteredRows={filteredRows}
      totalRevenue={totalRevenue}
      totalOrders={totalOrders}
      totalAvgCheck={totalAvgCheck}
      topCashiers={topCashiers}
      onExportCsv={handleExportCsv}
      form={form}
      onFormFinish={handleFormFinish}
      quickPeriod={quickPeriod}
      onQuickPeriodSelect={handleQuickPeriodSelect}
      departmentOptions={departmentOptions}
      departmentFilter={departmentFilter}
      onDepartmentFilterChange={setDepartmentFilter}
    />
  );
}
