import { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { useGetStoreBalanceReportQuery } from '../../../api/rtkApi';
import type { StoreBalanceReportParams } from '../types';

const defaultPeriod: StoreBalanceReportParams = {
  from: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
  to: dayjs().format('YYYY-MM-DD'),
};

export interface UseStoreBalanceReportOptions {
  enabled: boolean;
}

export interface UseStoreBalanceReportResult {
  period: StoreBalanceReportParams;
  setPeriod: (params: StoreBalanceReportParams) => void;
  data: import('../types').StoreBalanceReportRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

export function useStoreBalanceReport(options: UseStoreBalanceReportOptions): UseStoreBalanceReportResult {
  const { enabled } = options;
  const [period, setPeriodState] = useState<StoreBalanceReportParams>(defaultPeriod);

  const skip = !enabled || !period.from || !period.to;

  const { data, isLoading, isError, error, refetch: rtkRefetch } = useGetStoreBalanceReportQuery(period, {
    skip,
    refetchOnMountOrArgChange: true,
  });

  const setPeriod = useCallback((params: StoreBalanceReportParams) => {
    setPeriodState(params);
  }, []);

  const refetch = useCallback(() => {
    rtkRefetch();
  }, [rtkRefetch]);

  return { period, setPeriod, data, isLoading, isError, error, refetch };
}
