import { useCallback, useState } from 'react';
import { useFetchOlapReportMutation } from '../../../api/rtkApi';
import { parseOlapToDishRows } from '../utils/parseOlapDishes';
import type { DishRow } from '../types';

const OLAP_PAYLOAD = {
  report: 'SALES' as const,
  groupByRowFields: ['DishName', 'DishCategory', 'Department'],
  aggregateFields: ['DishSumInt', 'DishAmountInt', 'ProductCostBase.ProductCost'],
};

export interface UseDishesReportOptions {
  enabled: boolean;
}

export interface UseDishesReportResult {
  rows: DishRow[];
  allCategories: string[];
  allDepartments: string[];
  isLoading: boolean;
  error: string | null;
  runReport: (from: string, to: string) => Promise<void>;
  clearError: () => void;
}

export function useDishesReport(options: UseDishesReportOptions): UseDishesReportResult {
  const { enabled } = options;
  const [trigger, { isLoading }] = useFetchOlapReportMutation();
  const [rows, setRows] = useState<DishRow[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
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
          setAllCategories([]);
          setAllDepartments([]);
          setErrorMessage('Ответ не в формате JSON. Убедитесь, что используется OLAP v2.');
          return;
        }

        const data = result.data as Record<string, unknown> | undefined;
        if (!data || typeof data !== 'object') {
          setRows([]);
          setAllCategories([]);
          setAllDepartments([]);
          return;
        }

        const parsed = parseOlapToDishRows(data);
        setRows(parsed.rows);
        setAllCategories(parsed.categories);
        setAllDepartments(parsed.departments);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : 'Ошибка загрузки');
        setRows([]);
        setAllCategories([]);
        setAllDepartments([]);
      }
    },
    [enabled, trigger]
  );

  const clearError = useCallback(() => setErrorMessage(null), []);

  return {
    rows,
    allCategories,
    allDepartments,
    isLoading,
    error: errorMessage,
    runReport,
    clearError,
  };
}
