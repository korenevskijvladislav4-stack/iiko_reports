import { useCallback, useState } from 'react';
import { useFetchOlapReportMutation } from '../../../api/rtkApi';
import { parseOlapToCashierRows } from '../utils/parseOlapCashiers';
import type { CashierRow } from '../types';

const OLAP_PAYLOAD = {
  report: 'SALES' as const,
  groupByRowFields: ['Cashier', 'Department'],
  aggregateFields: ['DishSumInt', 'UniqOrderId', 'DishAmountInt'],
};

export interface UseCashiersReportOptions {
  enabled: boolean;
}

export interface UseCashiersReportResult {
  rows: CashierRow[];
  allDepartments: string[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  runReport: (from: string, to: string) => Promise<void>;
}

export function useCashiersReport(options: UseCashiersReportOptions): UseCashiersReportResult {
  const { enabled } = options;
  const [trigger, { isLoading, isError, error: rtkError }] = useFetchOlapReportMutation();
  const [rows, setRows] = useState<CashierRow[]>([]);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runReport = useCallback(
    async (from: string, to: string) => {
      if (!enabled) return;
      setErrorMessage(null);
      try {
        const result = await trigger({
          ...OLAP_PAYLOAD,
          from,
          to,
        }).unwrap();

        if (result.raw) {
          setRows([]);
          setAllDepartments([]);
          setErrorMessage('Ответ не в формате JSON. Убедитесь, что используется OLAP v2.');
          return;
        }

        const data = result.data as Record<string, unknown> | undefined;
        if (!data || typeof data !== 'object') {
          setRows([]);
          setAllDepartments([]);
          return;
        }

        const { rows: parsedRows, departments } = parseOlapToCashierRows(data);
        setRows(parsedRows);
        setAllDepartments(departments);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : 'Ошибка загрузки');
        setRows([]);
        setAllDepartments([]);
      }
    },
    [enabled, trigger]
  );

  const error = isError && rtkError ? (rtkError as { data?: { message?: string }; message?: string }).message ?? String(rtkError) : errorMessage;

  return {
    rows,
    allDepartments,
    isLoading,
    isError: isError || !!errorMessage,
    error: error ?? null,
    runReport,
  };
}
