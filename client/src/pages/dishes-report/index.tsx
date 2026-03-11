import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Alert } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useGetProductGroupValuesQuery } from '../../api/rtkApi';
import { useDishesReport } from './hooks';
import { DishesReportView } from './DishesReportView';
import { buildDishColumns } from './constants';
import type { DishRow } from './types';

function formatDateForOlap(d: Dayjs): string {
  return d.format('DD.MM.YYYY');
}

function exportToCsv(rows: DishRow[], hasAnyCost: boolean, filename: string): void {
  if (rows.length === 0) return;
  const headers = ['Блюдо', 'Категория', 'Точка', 'Кол-во', 'Выручка', 'Себестоимость', 'Маржа', 'Маржа %', 'Доля %', 'Средняя цена'];
  const escape = (v: string | number) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v));
  const csvRows = rows.map((r) =>
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
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DishesReportPage() {
  const { auth } = useAuth();
  const [form] = Form.useForm();
  const [quickPeriod, setQuickPeriod] = useState<string | null>(null);

  const { rows, allCategories, allDepartments, isLoading, error, runReport, clearError } = useDishesReport({ enabled: !!auth });
  const { data: productGroupOptions = [] } = useGetProductGroupValuesQuery(undefined, { skip: !auth });

  const includeGroups = Form.useWatch('productGroupInclude', form) ?? [];
  const excludeGroups = Form.useWatch('productGroupExclude', form) ?? [];
  const selectedDepts = Form.useWatch('departmentFilter', form) ?? [];

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (Array.isArray(includeGroups) && includeGroups.length > 0 && !includeGroups.includes(r.category)) return false;
      if (Array.isArray(excludeGroups) && excludeGroups.length > 0 && excludeGroups.includes(r.category)) return false;
      if (Array.isArray(selectedDepts) && selectedDepts.length > 0 && !selectedDepts.includes(r.department)) return false;
      return true;
    });
  }, [rows, includeGroups, excludeGroups, selectedDepts]);

  const allDishes = useMemo(() => [...new Set(rows.map((r) => r.dish))].sort(), [rows]);
  const totalRevenue = useMemo(() => filteredRows.reduce((s, x) => s + x.revenue, 0), [filteredRows]);
  const totalCost = useMemo(() => filteredRows.reduce((s, x) => s + x.cost, 0), [filteredRows]);
  const totalMargin = totalRevenue - totalCost;
  const hasAnyCost = useMemo(() => filteredRows.some((x) => x.hasCost), [filteredRows]);

  const columns = useMemo(
    () => buildDishColumns(allDishes, allCategories, allDepartments, hasAnyCost),
    [allDishes, allCategories, allDepartments, hasAnyCost]
  );

  const topDishes = useMemo(() => [...filteredRows].sort((a, b) => b.revenue - a.revenue).slice(0, 5), [filteredRows]);
  const categoryRevenueTop = useMemo(() => {
    const byCat = new Map<string, number>();
    filteredRows.forEach((r) => byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.revenue));
    return Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredRows]);

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
    exportToCsv(filteredRows, hasAnyCost, `dishes-report-${dayjs().format('YYYY-MM-DD')}.csv`);
  }, [filteredRows, hasAnyCost]);

  const departmentOptions = useMemo(() => allDepartments.map((d) => ({ label: d, value: d })), [allDepartments]);
  const productGroupFilterOptions = productGroupOptions.length > 0 ? productGroupOptions : allCategories;

  if (!auth) {
    return (
      <Alert type="warning" message="Выполните вход" description="Перейдите на главную и войдите в сервер iiko." />
    );
  }

  return (
    <DishesReportView
      error={error}
      onDismissError={clearError}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      filteredRows={filteredRows}
      totalRevenue={totalRevenue}
      totalCost={totalCost}
      totalMargin={totalMargin}
      hasAnyCost={hasAnyCost}
      columns={columns}
      topDishes={topDishes}
      categoryRevenueTop={categoryRevenueTop}
      onExportCsv={handleExportCsv}
      form={form}
      onFormFinish={handleFormFinish}
      quickPeriod={quickPeriod}
      onQuickPeriodSelect={handleQuickPeriodSelect}
      departmentOptions={departmentOptions}
      productGroupFilterOptions={productGroupFilterOptions}
    />
  );
}
