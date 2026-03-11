import type { ColumnsType } from 'antd/es/table';
import type { CashierRow } from './types';

export function formatCurrency(value: number): string {
  if (value === 0 && 1 / value < 0) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export const cashierColumns: ColumnsType<CashierRow> = [
  {
    title: 'Кассир',
    dataIndex: 'cashier',
    key: 'cashier',
    fixed: 'left',
    width: 200,
    sorter: (a, b) => a.cashier.localeCompare(b.cashier),
    render: (v: string) => <strong>{v}</strong>,
  },
  {
    title: 'Точка',
    dataIndex: 'department',
    key: 'department',
    width: 160,
    sorter: (a, b) => a.department.localeCompare(b.department),
  },
  {
    title: 'Выручка',
    dataIndex: 'revenue',
    key: 'revenue',
    width: 120,
    align: 'right',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.revenue - b.revenue,
    render: (v: number) => formatCurrency(v),
  },
  {
    title: 'Чеков',
    dataIndex: 'orders',
    key: 'orders',
    width: 90,
    align: 'right',
    sorter: (a, b) => a.orders - b.orders,
    render: (v: number) => v.toLocaleString('ru-RU'),
  },
  {
    title: 'Блюд',
    dataIndex: 'dishAmount',
    key: 'dishAmount',
    width: 90,
    align: 'right',
    sorter: (a, b) => a.dishAmount - b.dishAmount,
    render: (v: number) => v.toLocaleString('ru-RU'),
  },
  {
    title: 'Средний чек',
    dataIndex: 'avgCheck',
    key: 'avgCheck',
    width: 120,
    align: 'right',
    sorter: (a, b) => a.avgCheck - b.avgCheck,
    render: (v: number) => (v > 0 ? formatCurrency(v) : '—'),
  },
  {
    title: 'Доля %',
    dataIndex: 'sharePct',
    key: 'sharePct',
    width: 90,
    align: 'right',
    sorter: (a, b) => a.sharePct - b.sharePct,
    render: (v: number) => `${v.toFixed(1)}%`,
  },
];
