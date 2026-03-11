import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Alert } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { useGetDepartmentsQuery } from '../../api/rtkApi';
import { getErrorMessage } from '../../utils/error';
import { useDepartmentSalaryReport, useDepartmentSalaryTable } from './hooks';
import { DepartmentSalaryView } from './DepartmentSalaryView';
import type { DepartmentSalaryRowWithKey } from './types';

function exportToCsv(rows: DepartmentSalaryRowWithKey[], filename: string): void {
  if (rows.length === 0) return;
  const headers = [
    'Подразделение',
    'Должность',
    'Сотрудник',
    'Почасовая ставка',
    'Отработано часов',
    'Зарплата за период',
  ];
  const escape = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const csvRows = rows.map((r) =>
    [
      r.departmentName,
      r.positionName ?? '',
      r.employeeName,
      r.hourlyRate.toFixed(2).replace('.', ','),
      r.hours.toFixed(2).replace('.', ','),
      r.salary,
    ]
      .map(escape)
      .join(',')
  );
  const csv = [headers.map(escape).join(','), ...csvRows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DepartmentSalaryPage() {
  const { auth } = useAuth();
  const [form] = Form.useForm();
  const [quickPeriod, setQuickPeriod] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [errorDismissed, setErrorDismissed] = useState(false);

  const {
    period,
    setPeriod,
    data: reportData,
    isLoading,
    isError,
    error: reportError,
    refetch,
  } = useDepartmentSalaryReport({ enabled: !!auth });

  const { data: departments = [] } = useGetDepartmentsQuery(undefined, { skip: !auth });

  const rows = reportData ?? [];
  const { filteredRows, tableRows, totals } = useDepartmentSalaryTable({
    rows,
    departmentFilter,
  });

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
    form.setFieldsValue({
      dateFrom: dayjs(period.from),
      dateTo: dayjs(period.to),
    });
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
      setPeriod({
        from: from.format('YYYY-MM-DD'),
        to: to.format('YYYY-MM-DD'),
      });
    },
    [form, setPeriod]
  );

  const handleExportCsv = useCallback(() => {
    exportToCsv(filteredRows, `department-salary-${dayjs().format('YYYY-MM-DD')}.csv`);
  }, [filteredRows]);

  const departmentOptions = useMemo(
    () =>
      departments.length > 0
        ? departments.map((d) => ({ label: d.name, value: d.name }))
        : Array.from(new Set(rows.map((r) => r.departmentName))).map((name) => ({ label: name, value: name })),
    [departments, rows]
  );

  if (!auth) {
    return (
      <Alert
        type="warning"
        message="Выполните вход"
        description="Перейдите на главную и войдите в сервер iiko."
      />
    );
  }

  return (
    <DepartmentSalaryView
      error={errorMessage}
      onDismissError={handleDismissError}
      onRetry={handleRetry}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      filteredCount={filteredRows.length}
      totals={totals}
      tableRows={tableRows}
      onExportCsv={handleExportCsv}
      form={form}
      onFormFinish={handleFormFinish}
      quickPeriod={quickPeriod}
      onQuickPeriodSelect={handleQuickPeriodSelect}
      departmentOptions={departmentOptions}
      departmentFilter={departmentFilter}
      onDepartmentFilterChange={setDepartmentFilter}
      submitLoading={isLoading}
    />
  );
}
