export interface DishRow {
  key: string;
  dish: string;
  category: string;
  department: string;
  amount: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
  sharePct: number;
  avgPrice: number;
  hasCost: boolean;
}
