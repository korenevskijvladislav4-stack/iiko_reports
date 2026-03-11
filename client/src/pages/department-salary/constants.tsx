import type { ColumnsType } from 'antd/es/table';
import type { DepartmentSalaryTableRow } from './types';

const groupCellStyle = { background: 'rgba(15,23,42,0.7)', fontWeight: 'bold' as const };

export const departmentSalaryColumns: ColumnsType<DepartmentSalaryTableRow> = [
  {
    title: 'Подразделение',
    dataIndex: 'departmentName',
    key: 'departmentName',
    width: 220,
    align: 'center',
    render: (v: string, record) =>
      record.type === 'group' ? <strong style={{ fontSize: 12 }}>📁 {v}</strong> : '',
    onCell: (record) => (record.type === 'group' ? { style: groupCellStyle } : {}),
  },
  {
    title: 'Должность',
    dataIndex: 'positionName',
    key: 'positionName',
    width: 200,
    align: 'center',
    render: (v: string | null | undefined, record) =>
      record.type === 'group' ? <em>Итого по подразделению</em> : v ?? '—',
    onCell: (record) => (record.type === 'group' ? { style: groupCellStyle } : {}),
  },
  {
    title: 'Сотрудник',
    dataIndex: 'employeeName',
    key: 'employeeName',
    width: 220,
    align: 'center',
    render: (v: string | undefined, record) => (record.type === 'group' ? '' : v),
  },
  {
    title: 'Почасовая ставка',
    dataIndex: 'hourlyRate',
    key: 'hourlyRate',
    width: 160,
    align: 'center',
    render: (v: number | undefined, record) =>
      record.type === 'group' ? '' : v != null && v > 0 ? `${v.toFixed(2)} ₽` : '—',
  },
  {
    title: 'Отработано часов',
    dataIndex: 'hours',
    key: 'hours',
    width: 150,
    align: 'center',
    render: (v: number) => v.toFixed(2).replace('.', ','),
    onCell: (record) => (record.type === 'group' ? { style: groupCellStyle } : {}),
  },
  {
    title: 'Зарплата за период',
    dataIndex: 'salary',
    key: 'salary',
    width: 180,
    align: 'center',
    render: (v: number) =>
      new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(v),
    onCell: (record) => (record.type === 'group' ? { style: groupCellStyle } : {}),
  },
];

export function formatSalary(v: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}
