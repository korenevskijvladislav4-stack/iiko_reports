import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Alert } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useGetProductGroupValuesQuery } from '../../api/rtkApi';
import { getErrorMessage } from '../../utils/error';
import { useProductCostReport, useProductCostTable } from './hooks';
import { ProductCostView } from './ProductCostView';
import type { ProductCostRowWithKey } from './types';

function exportToCsv(rows: ProductCostRowWithKey[], filename: string): void {
  if (rows.length === 0) return;
  const headers = [
    'Группа товаров', 'Товар', 'Кол-во проданных', 'Себестоимость из iiko', 'Себестоимость единицы',
    'Зарплата цеха', 'Человеческая стоимость', 'Себестоимость ед. + человеч.', 'Текущая стоимость из iiko',
    'Разница (цена − себестоимость ед.)',
  ];
  const escape = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const csvRows = rows.map((r) => {
    const unitCost = r.quantitySold > 0 ? r.costFromIiko / r.quantitySold : 0;
    const unitPlusHuman = unitCost + r.humanCost;
    const price = r.currentPriceFromIiko ?? 0;
    const diff = price > 0 ? price - unitPlusHuman : '';
    return [
      r.productGroup, r.product, r.quantitySold, r.costFromIiko, unitCost.toFixed(2), r.departmentSalary,
      r.humanCost.toFixed(2), unitPlusHuman.toFixed(2), r.currentPriceFromIiko ?? '',
      typeof diff === 'number' ? diff.toFixed(2) : diff,
    ].map(escape).join(',');
  });
  const csv = [headers.map(escape).join(','), ...csvRows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProductCostPage() {
  const { auth } = useAuth();
  const [form] = Form.useForm();
  const [quickPeriod, setQuickPeriod] = useState<string | null>(null);
  const [productGroupFilter, setProductGroupFilter] = useState<string[]>([]);
  const [errorDismissed, setErrorDismissed] = useState(false);

  const {
    period,
    setPeriod,
    data: reportData,
    isLoading,
    isError,
    error: reportError,
    refetch,
  } = useProductCostReport({ enabled: !!auth });

  const { data: productGroupOptions = [] } = useGetProductGroupValuesQuery(undefined, { skip: !auth });

  const rows = reportData?.rows ?? [];
  const totalDepartmentSalary = reportData?.totalDepartmentSalary ?? 0;
  const { filteredRows, totals } = useProductCostTable({ rows, productGroupFilter });

  const errorMessage =
    isError && reportError && !errorDismissed
      ? getErrorMessage(reportError, 'Ошибка загрузки отчёта')
      : null;

  const handleDismissError = useCallback(() => setErrorDismissed(true), []);
  const handleRetry = useCallback(() => {
    setErrorDismissed(false);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!auth) return;
    form.setFieldsValue({ dateFrom: dayjs(period.from), dateTo: dayjs(period.to) });
  }, [auth, period.from, period.to, form]);

  const handleFormFinish = useCallback(() => {
    setErrorDismissed(false);
    const { dateFrom, dateTo } = form.getFieldsValue();
    const from = (dateFrom ? dayjs(dateFrom) : dayjs().startOf('month')).format('YYYY-MM-DD');
    const to = (dateTo ? dayjs(dateTo) : dayjs().endOf('month')).format('YYYY-MM-DD');
    setQuickPeriod(null);
    setPeriod({ from, to });
  }, [form, setPeriod]);

  const handleQuickPeriodSelect = useCallback(
    (key: string, from: Dayjs, to: Dayjs) => {
      form.setFieldsValue({ dateFrom: from, dateTo: to });
      setQuickPeriod(key);
      setPeriod({ from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') });
    },
    [form, setPeriod]
  );

  const handleExportCsv = useCallback(() => {
    exportToCsv(filteredRows, `product-cost-${dayjs().format('YYYY-MM-DD')}.csv`);
  }, [filteredRows]);

  const productGroupOptionsForSelect = useMemo(
    () => [...new Set([...productGroupOptions, ...rows.map((r) => r.productGroup)])].map((g) => ({ label: g, value: g })),
    [productGroupOptions, rows]
  );

  if (!auth) {
    return (
      <Alert type="warning" message="Выполните вход" description="Перейдите на главную и войдите в сервер iiko." />
    );
  }

  return (
    <ProductCostView
      error={errorMessage}
      onDismissError={handleDismissError}
      onRetry={handleRetry}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      filteredCount={filteredRows.length}
      totals={totals}
      totalDepartmentSalary={totalDepartmentSalary}
      tableRows={filteredRows}
      onExportCsv={handleExportCsv}
      form={form}
      onFormFinish={handleFormFinish}
      quickPeriod={quickPeriod}
      onQuickPeriodSelect={handleQuickPeriodSelect}
      productGroupOptions={productGroupOptionsForSelect}
      productGroupFilter={productGroupFilter}
      onProductGroupFilterChange={setProductGroupFilter}
      submitLoading={isLoading}
    />
  );
}
