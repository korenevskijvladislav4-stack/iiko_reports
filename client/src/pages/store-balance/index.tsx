import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Alert } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useGetPointsQuery } from '../../api/rtkApi';
import { getErrorMessage } from '../../utils/error';
import { useStoreBalanceReport, useStoreBalanceTable } from './hooks';
import { StoreBalanceView } from './StoreBalanceView';
import type { StoreBalanceRowWithKey } from './types';

function exportToCsv(
  rows: StoreBalanceRowWithKey[],
  dayKeys: string[],
  filename: string
): void {
  if (rows.length === 0) return;
  const headers = [
    'Точка',
    'Товар',
    'Группа товаров',
    'Остаток',
    'Сумма по себестоимости',
    'Продано за период',
    ...dayKeys.map((d) => dayjs(d).format('DD.MM.YYYY')),
  ];
  const escape = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const csvRows = rows.map((r) => {
    const base: (string | number)[] = [
      r.pointName,
      r.productName ?? '',
      r.productGroup ?? '',
      r.amount,
      r.sum,
      r.totalSold ?? 0,
    ];
    const perDays = dayKeys.map((date) => {
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
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StoreBalancePage() {
  const { auth } = useAuth();
  const [form] = Form.useForm();
  const [quickPeriod, setQuickPeriod] = useState<string | null>('7d');
  const [pointFilter, setPointFilter] = useState<string[]>([]);
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [errorDismissed, setErrorDismissed] = useState(false);

  const {
    period,
    setPeriod,
    data: reportData,
    isLoading,
    isError,
    error: reportError,
    refetch,
  } = useStoreBalanceReport({ enabled: !!auth });

  const { data: pointsList = [] } = useGetPointsQuery(undefined, { skip: !auth });

  const rows = reportData ?? [];
  const { filteredRows, dayKeys, columns } = useStoreBalanceTable({
    rows,
    pointFilter,
    groupFilter,
  });

  const errorMessage =
    isError && reportError && !errorDismissed
      ? getErrorMessage(reportError, 'Не удалось получить данные из iiko')
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
    const from = (dateFrom ? dayjs(dateFrom) : dayjs().subtract(6, 'day')).format('YYYY-MM-DD');
    const to = (dateTo ? dayjs(dateTo) : dayjs()).format('YYYY-MM-DD');
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
    exportToCsv(filteredRows, dayKeys, `store-balance-${dayjs().format('YYYY-MM-DD')}.csv`);
  }, [filteredRows, dayKeys]);

  const pointOptions = useMemo(
    () => pointsList.map((p) => ({ label: p, value: p })),
    [pointsList]
  );

  const groupOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.productGroup).filter((g): g is string => !!g))).sort().map((g) => ({
        label: g,
        value: g,
      })),
    [rows]
  );

  if (!auth) {
    return (
      <Alert type="warning" message="Выполните вход" description="Перейдите на главную и войдите в сервер iiko." />
    );
  }

  return (
    <StoreBalanceView
      error={errorMessage}
      onDismissError={handleDismissError}
      onRetry={handleRetry}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      filteredCount={filteredRows.length}
      tableRows={filteredRows}
      columns={columns}
      onExportCsv={handleExportCsv}
      form={form}
      onFormFinish={handleFormFinish}
      quickPeriod={quickPeriod}
      onQuickPeriodSelect={handleQuickPeriodSelect}
      pointOptions={pointOptions}
      pointFilter={pointFilter}
      onPointFilterChange={setPointFilter}
      groupOptions={groupOptions}
      groupFilter={groupFilter}
      onGroupFilterChange={setGroupFilter}
      submitLoading={isLoading}
    />
  );
}
