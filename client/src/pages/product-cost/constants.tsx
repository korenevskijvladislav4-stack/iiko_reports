import type { ColumnsType } from 'antd/es/table';
import type { ProductCostRowWithKey } from './types';

export function formatCurrency(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export const productCostColumns: ColumnsType<ProductCostRowWithKey> = [
  { title: 'Группа товаров', dataIndex: 'productGroup', key: 'productGroup', width: 180, ellipsis: true, align: 'center' },
  { title: 'Товар', dataIndex: 'product', key: 'product', width: 220, ellipsis: true, align: 'center' },
  {
    title: 'Кол-во проданных',
    dataIndex: 'quantitySold',
    key: 'quantitySold',
    width: 140,
    align: 'center',
    render: (v: number) => v.toLocaleString('ru-RU'),
  },
  {
    title: 'Себестоимость из iiko',
    dataIndex: 'costFromIiko',
    key: 'costFromIiko',
    width: 140,
    align: 'center',
    render: (v: number) => formatCurrency(v),
  },
  {
    title: 'Себестоимость единицы',
    key: 'unitCost',
    width: 140,
    align: 'center',
    render: (_: unknown, r: ProductCostRowWithKey) =>
      r.quantitySold > 0 ? formatCurrency(r.costFromIiko / r.quantitySold, 2) : '—',
  },
  {
    title: 'Зарплата цеха',
    dataIndex: 'departmentSalary',
    key: 'departmentSalary',
    width: 120,
    align: 'center',
    render: (v: number) => formatCurrency(v),
  },
  {
    title: 'Человеческая стоимость',
    dataIndex: 'humanCost',
    key: 'humanCost',
    width: 150,
    align: 'center',
    render: (v: number) => formatCurrency(v, 2),
  },
  {
    title: 'Себестоимость ед. + человеч.',
    key: 'unitCostPlusHuman',
    width: 180,
    align: 'center',
    render: (_: unknown, r: ProductCostRowWithKey) => {
      const unitCost = r.quantitySold > 0 ? r.costFromIiko / r.quantitySold : 0;
      return formatCurrency(unitCost + r.humanCost, 2);
    },
  },
  {
    title: 'Текущая стоимость из iiko',
    dataIndex: 'currentPriceFromIiko',
    key: 'currentPriceFromIiko',
    width: 160,
    align: 'center',
    render: (v: number) => (v != null && v > 0 ? formatCurrency(v, 2) : '—'),
  },
  {
    title: 'Разница (цена − себестоимость ед.)',
    key: 'priceMinusCost',
    width: 200,
    align: 'center',
    render: (_: unknown, r: ProductCostRowWithKey) => {
      const unitCost = r.quantitySold > 0 ? r.costFromIiko / r.quantitySold : 0;
      const fullCost = unitCost + r.humanCost;
      const price = r.currentPriceFromIiko ?? 0;
      if (price <= 0) return '—';
      return formatCurrency(price - fullCost, 2);
    },
  },
];
