export type SalesRow = Record<string, string | number>;

export type SalesGroupBy = 'day' | 'week' | 'month' | 'quarter';

export interface Totals {
  dishAmount: number;
  dishSum: number;
  uniqOrderId: number;
}

export interface Ranges {
  dishAmount: { min: number; max: number };
  dishSum: { min: number; max: number };
  uniqOrderId: { min: number; max: number };
  avgCheck: { min: number; max: number };
  avgFill: { min: number; max: number };
}

export interface TableRow {
  type: 'group' | 'month';
  key: string;
  department: string;
  departmentKey: string;
  period: string;
  periodSortKey?: string;
  dishAmount: number;
  uniqOrderId: number;
  guestNum?: number;
  dishSum: number;
  dishReturnSum?: number;
  avgCheck: number;
  avgFill: number;
  ranges?: Ranges;
}
