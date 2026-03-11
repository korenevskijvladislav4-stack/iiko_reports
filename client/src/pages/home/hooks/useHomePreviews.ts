import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { useFetchOlapReportMutation } from '../../../api/rtkApi';
import { parseWeekRevenue, parseTopDishes, extractTodayFromWeekData } from '../utils';
import type { WeekDayPoint, TopDishItem } from '../types';
import type { TodaySummary } from '../types';

/** Те же поля, что и для блока «сегодня» в шапке — один запрос за неделю даёт и график, и сводку за день */
const WEEK_AGGREGATE_FIELDS = [
  'DishSumInt',
  'GuestNum',
  'DishAmountInt',
  'UniqOrderId',
  'DishDiscountSumInt.average',
  'DishAmountInt.PerOrder',
] as const;

export interface HomePreviewsState {
  weekData: WeekDayPoint[];
  topDishes: TopDishItem[];
  todaySummary: TodaySummary;
  loading: boolean;
  error: string | null;
}

export function useHomePreviews(enabled: boolean): HomePreviewsState {
  const [fetchOlap] = useFetchOlapReportMutation();
  const [weekData, setWeekData] = useState<WeekDayPoint[]>([]);
  const [topDishes, setTopDishes] = useState<TopDishItem[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodaySummary>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    const from = dayjs().subtract(6, 'day').format('DD.MM.YYYY');
    const to = dayjs().format('DD.MM.YYYY');
    const todayStr = dayjs().format('DD.MM.YYYY');
    try {
      const [weekResult, dishesResult] = await Promise.all([
        fetchOlap({
          report: 'SALES',
          from,
          to,
          groupByRowFields: ['OpenDate.Typed'],
          aggregateFields: [...WEEK_AGGREGATE_FIELDS],
        }).unwrap(),
        fetchOlap({
          report: 'SALES',
          from,
          to,
          groupByRowFields: ['DishName'],
          aggregateFields: ['DishSumInt'],
        }).unwrap(),
      ]);
      if (weekResult.raw) {
        setWeekData([]);
        setTodaySummary(null);
      } else {
        setWeekData(parseWeekRevenue(weekResult.data));
        setTodaySummary(extractTodayFromWeekData(weekResult.data, todayStr));
      }
      if (dishesResult.raw) {
        setTopDishes([]);
      } else {
        setTopDishes(parseTopDishes(dishesResult.data, 5));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки превью');
      setWeekData([]);
      setTopDishes([]);
      setTodaySummary(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, fetchOlap]);

  useEffect(() => {
    load();
  }, [load]);

  return { weekData, topDishes, todaySummary, loading, error };
}
