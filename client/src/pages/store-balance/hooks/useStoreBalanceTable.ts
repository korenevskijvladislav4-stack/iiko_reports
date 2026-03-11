import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { StoreBalanceReportRow, StoreBalanceRowWithKey } from '../types';

export interface UseStoreBalanceTableParams {
  rows: StoreBalanceReportRow[];
  pointFilter: string[];
  groupFilter: string[];
}

export interface UseStoreBalanceTableResult {
  filteredRows: StoreBalanceRowWithKey[];
  dayKeys: string[];
  columns: ColumnsType<StoreBalanceRowWithKey>;
}

function formatSum(v: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

export function useStoreBalanceTable(params: UseStoreBalanceTableParams): UseStoreBalanceTableResult {
  const { rows, pointFilter, groupFilter } = params;

  const rowsWithKey = useMemo((): StoreBalanceRowWithKey[] => {
    return rows.map((r, i) => ({
      key: `${r.pointName}\t${r.storeId}\t${r.productId}\t${i}`,
      pointName: r.pointName,
      productName: r.productName,
      productGroup: r.productGroup,
      amount: r.amount,
      sum: r.sum,
      totalSold: r.totalSold ?? 0,
      salesByDay: Array.isArray(r.salesByDay) ? r.salesByDay : [],
    }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    let res = rowsWithKey.filter((r) => {
      const hasName = typeof r.productName === 'string' && r.productName.trim().length > 0;
      const hasSales = (r.totalSold ?? 0) > 0;
      return hasName || hasSales;
    });
    if (pointFilter.length > 0) res = res.filter((r) => pointFilter.includes(r.pointName));
    if (groupFilter.length > 0) res = res.filter((r) => r.productGroup && groupFilter.includes(r.productGroup));
    return res;
  }, [rowsWithKey, pointFilter, groupFilter]);

  const dayKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      for (const d of r.salesByDay ?? []) {
        if (d.date) set.add(d.date);
      }
    }
    return Array.from(set).sort();
  }, [rows]);

  const columns = useMemo((): ColumnsType<StoreBalanceRowWithKey> => {
    const base: ColumnsType<StoreBalanceRowWithKey> = [
      { title: 'Точка', dataIndex: 'pointName', key: 'pointName', width: 220, align: 'center' },
      {
        title: 'Товар',
        dataIndex: 'productName',
        key: 'productName',
        width: 260,
        align: 'center',
        render: (_: unknown, r) => r.productName || '—',
      },
      {
        title: 'Группа товаров',
        dataIndex: 'productGroup',
        key: 'productGroup',
        width: 200,
        align: 'center',
        render: (_: unknown, r) => r.productGroup || '—',
      },
      {
        title: 'Продано за период',
        dataIndex: 'totalSold',
        key: 'totalSold',
        width: 150,
        align: 'center',
        render: (v: number) => (v != null ? v.toLocaleString('ru-RU') : '—'),
      },
    ];
    const perDayCols: ColumnsType<StoreBalanceRowWithKey> = dayKeys.map((date) => ({
      title: dayjs(date).format('DD.MM'),
      dataIndex: `day-${date}`,
      key: `day-${date}`,
      width: 110,
      align: 'center',
      render: (_: unknown, r: StoreBalanceRowWithKey) => {
        const found = r.salesByDay.find((d) => d.date === date);
        return found ? found.quantitySold.toLocaleString('ru-RU') : '—';
      },
    }));
    const tail: ColumnsType<StoreBalanceRowWithKey> = [
      { title: 'Остаток', dataIndex: 'amount', key: 'amount', width: 120, align: 'center' },
      {
        title: 'Сумма по себестоимости',
        dataIndex: 'sum',
        key: 'sum',
        width: 180,
        align: 'center',
        render: (v: number) => formatSum(v),
      },
    ];
    return [...base, ...perDayCols, ...tail];
  }, [dayKeys]);

  return { filteredRows, dayKeys, columns };
}
