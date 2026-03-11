import { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { useGetDepartmentSalaryReportQuery } from '../../../api/rtkApi';
import type { DepartmentSalaryReportParams, DepartmentSalaryReportRow } from '../types';

const defaultPeriod: DepartmentSalaryReportParams = {
  from: dayjs().startOf('month').format('YYYY-MM-DD'),
  to: dayjs().endOf('month').format('YYYY-MM-DD'),
};

export interface UseDepartmentSalaryReportOptions {
  enabled: boolean;
}

export interface UseDepartmentSalaryReportResult {
  period: DepartmentSalaryReportParams;
  setPeriod: (params: DepartmentSalaryReportParams) => void;
  data: DepartmentSalaryReportRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

export function useDepartmentSalaryReport(
  options: UseDepartmentSalaryReportOptions
): UseDepartmentSalaryReportResult {
  const { enabled } = options;
  const [period, setPeriodState] = useState<DepartmentSalaryReportParams>(defaultPeriod);

  const skip = !enabled || !period.from || !period.to;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch: rtkRefetch,
  } = useGetDepartmentSalaryReportQuery(period, {
    skip,
    refetchOnMountOrArgChange: true,
  });

  const setPeriod = useCallback((params: DepartmentSalaryReportParams) => {
    setPeriodState(params);
  }, []);

  const refetch = useCallback(() => {
    rtkRefetch();
  }, [rtkRefetch]);

  return {
    period,
    setPeriod,
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
}
