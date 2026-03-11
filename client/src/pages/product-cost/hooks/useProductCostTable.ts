import { useMemo } from 'react';
import type { ProductCostReportRow, ProductCostRowWithKey, ProductCostTotals } from '../types';

export interface UseProductCostTableParams {
  rows: ProductCostReportRow[];
  productGroupFilter: string[];
}

export interface UseProductCostTableResult {
  filteredRows: ProductCostRowWithKey[];
  totals: ProductCostTotals;
}

export function useProductCostTable(params: UseProductCostTableParams): UseProductCostTableResult {
  const { rows, productGroupFilter } = params;

  const rowsWithKey = useMemo(
    () =>
      rows.map((r, i) => ({
        ...r,
        key: `${r.productGroup}\t${r.product}\t${i}`,
        currentPriceFromIiko: r.currentPriceFromIiko ?? 0,
      })),
    [rows]
  );

  const filteredRows = useMemo(() => {
    if (productGroupFilter.length === 0) return rowsWithKey;
    return rowsWithKey.filter((r) => productGroupFilter.includes(r.productGroup));
  }, [rowsWithKey, productGroupFilter]);

  const totals = useMemo(
    (): ProductCostTotals =>
      filteredRows.reduce(
        (acc, r) => ({
          count: acc.count + 1,
          costFromIiko: acc.costFromIiko + r.costFromIiko,
          departmentSalary: acc.departmentSalary + r.departmentSalary,
          quantitySold: acc.quantitySold + r.quantitySold,
        }),
        { count: 0, costFromIiko: 0, departmentSalary: 0, quantitySold: 0 }
      ),
    [filteredRows]
  );

  return { filteredRows, totals };
}
