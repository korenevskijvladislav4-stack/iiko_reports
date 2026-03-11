import { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { useGetProductCostReportQuery } from '../../../api/rtkApi';
import type { ProductCostReportParams } from '../types';

const defaultPeriod: ProductCostReportParams = {
  from: dayjs().startOf('month').format('YYYY-MM-DD'),
  to: dayjs().endOf('month').format('YYYY-MM-DD'),
};

export interface UseProductCostReportOptions {
  enabled: boolean;
}

export interface UseProductCostReportResult {
  period: ProductCostReportParams;
  setPeriod: (params: ProductCostReportParams) => void;
  data: { rows: import('../types').ProductCostReportRow[]; totalDepartmentSalary: number } | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

export function useProductCostReport(options: UseProductCostReportOptions): UseProductCostReportResult {
  const { enabled } = options;
  const [period, setPeriodState] = useState<ProductCostReportParams>(defaultPeriod);

  const skip = !enabled || !period.from || !period.to;

  const { data, isLoading, isError, error, refetch: rtkRefetch } = useGetProductCostReportQuery(period, {
    skip,
    refetchOnMountOrArgChange: true,
  });

  const setPeriod = useCallback((params: ProductCostReportParams) => {
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
