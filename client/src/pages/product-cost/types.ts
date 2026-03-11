/** Строка отчёта себестоимости (ответ API) */
export interface ProductCostReportRow {
  productGroup: string;
  product: string;
  quantitySold: number;
  costFromIiko: number;
  departmentSalary: number;
  humanCost: number;
  currentPriceFromIiko?: number;
}

export interface ProductCostReportParams {
  from: string;
  to: string;
}

export interface ProductCostRowWithKey extends ProductCostReportRow {
  key: string;
}

export interface ProductCostTotals {
  count: number;
  costFromIiko: number;
  departmentSalary: number;
  quantitySold: number;
}
