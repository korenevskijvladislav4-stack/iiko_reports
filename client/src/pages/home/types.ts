export type TodaySummary = {
  revenue: number;
  checks: number;
  guests: number;
  avgCheck: number;
  revenuePerGuest: number;
  dishes: number;
} | null;

export type SalesRow = Record<string, string | number>;

/** Точка для графика выручки по дням */
export type WeekDayPoint = {
  date: string;
  label: string;
  revenue: number;
};

/** Позиция топа блюд для превью на главной */
export type TopDishItem = {
  name: string;
  revenue: number;
};
