export interface StoreBalanceReportRow {
  pointName: string;
  departmentId: string | null;
  storeId: string;
  productId: string;
  productName: string | null;
  productGroup: string | null;
  amount: number;
  sum: number;
  totalSold: number;
  salesByDay: { date: string; quantitySold: number }[];
}

export interface StoreBalanceReportParams {
  from: string;
  to: string;
}

export interface StoreBalanceRowWithKey {
  key: string;
  pointName: string;
  productName: string | null;
  productGroup: string | null;
  amount: number;
  sum: number;
  totalSold: number;
  salesByDay: { date: string; quantitySold: number }[];
}
