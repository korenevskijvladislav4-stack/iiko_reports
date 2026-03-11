import type { CSSProperties } from 'react';

export interface ReportLinkItem {
  path: string;
  title: string;
  description: string;
  tag: string;
  iconStyle: CSSProperties;
}

export const REPORT_LINKS: ReportLinkItem[] = [
  {
    path: '/reports/sales',
    title: 'Отчёт по продажам',
    description: 'Полная выручка по департаментам, точкам и типам заказов.',
    tag: 'Для владельцев и директоров',
    iconStyle: {
      background: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
      boxShadow: '0 8px 24px rgba(34, 211, 238, 0.35)',
    },
  },
  {
    path: '/reports/dishes',
    title: 'Отчёт по блюдам',
    description: 'Топ‑блюда, маржа, себестоимость и фильтры по категориям.',
    tag: 'Для шефов и закупки',
    iconStyle: {
      background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
      boxShadow: '0 8px 24px rgba(14, 165, 233, 0.35)',
    },
  },
  {
    path: '/reports/cashiers',
    title: 'Отчёт по кассирам',
    description: 'Эффективность каждой кассовой смены: выручка, гости, средний чек.',
    tag: 'Для операционного контроля',
    iconStyle: {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      boxShadow: '0 8px 24px rgba(139, 92, 246, 0.35)',
    },
  },
  {
    path: '/reports/product-cost',
    title: 'Стоимость товара',
    description: 'Себестоимость из iiko, зарплата цеха по графикам, человеческая стоимость на единицу.',
    tag: 'Для расчёта себестоимости',
    iconStyle: {
      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      boxShadow: '0 8px 24px rgba(34, 197, 94, 0.35)',
    },
  },
  {
    path: '/reports/store-balance',
    title: 'Остатки на точках',
    description: 'Остатки товаров по точкам на дату.',
    tag: 'Складской учёт',
    iconStyle: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)',
    },
  },
  {
    path: '/reports/department-salary',
    title: 'Зарплата по подразделениям',
    description: 'Зарплатные расходы по подразделениям и графикам.',
    tag: 'ФОТ',
    iconStyle: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
      boxShadow: '0 8px 24px rgba(6, 182, 212, 0.35)',
    },
  },
];

/** Количество отчётов, показываемых на главной без модалки */
export const VISIBLE_REPORTS_COUNT = 2;
