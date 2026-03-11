import type { ColumnsType } from 'antd/es/table';
import type { DishRow } from './types';

export function formatCurrency(value: number): string {
  if (value === 0 && 1 / value < 0) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildDishColumns(
  allDishes: string[],
  allCategories: string[],
  allDepartments: string[],
  hasAnyCost: boolean
): ColumnsType<DishRow> {
  return [
    {
      title: 'Блюдо',
      dataIndex: 'dish',
      key: 'dish',
      fixed: 'left',
      width: 220,
      sorter: (a, b) => a.dish.localeCompare(b.dish),
      render: (v: string) => <strong>{v}</strong>,
      filters: allDishes.map((d) => ({ text: d, value: d })),
      onFilter: (value, record) => record.dish === value,
      filterSearch: true,
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      width: 160,
      sorter: (a, b) => a.category.localeCompare(b.category),
      filters: allCategories.map((c) => ({ text: c, value: c })),
      onFilter: (value, record) => record.category === value,
      filterSearch: true,
    },
    {
      title: 'Точка',
      dataIndex: 'department',
      key: 'department',
      width: 140,
      sorter: (a, b) => a.department.localeCompare(b.department),
      filters: allDepartments.map((d) => ({ text: d, value: d })),
      onFilter: (value, record) => record.department === value,
      filterSearch: true,
    },
    {
      title: 'Кол-во',
      dataIndex: 'amount',
      key: 'amount',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (v: number) => v.toLocaleString('ru-RU'),
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
      title: 'Себестоимость',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.cost - b.cost,
      render: (v: number) => (hasAnyCost ? formatCurrency(v) : '—'),
    },
    {
      title: 'Маржа',
      dataIndex: 'margin',
      key: 'margin',
      width: 110,
      align: 'right',
      sorter: (a, b) => a.margin - b.margin,
      render: (v: number) => (hasAnyCost ? formatCurrency(v) : '—'),
    },
    {
      title: 'Маржа %',
      dataIndex: 'marginPct',
      key: 'marginPct',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.marginPct - b.marginPct,
      render: (_: unknown, r: DishRow) => (r.hasCost ? `${r.marginPct.toFixed(1)}%` : '—'),
    },
    {
      title: 'Доля в выручке %',
      dataIndex: 'sharePct',
      key: 'sharePct',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.sharePct - b.sharePct,
      render: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      title: 'Средняя цена',
      dataIndex: 'avgPrice',
      key: 'avgPrice',
      width: 110,
      align: 'right',
      sorter: (a, b) => a.avgPrice - b.avgPrice,
      render: (v: number) => formatCurrency(v),
    },
  ];
}
