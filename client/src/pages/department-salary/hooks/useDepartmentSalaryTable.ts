import { useMemo } from 'react';
import type {
  DepartmentSalaryReportRow,
  DepartmentSalaryRowWithKey,
  DepartmentSalaryTableRow,
  DepartmentSalaryTotals,
} from '../types';

function toRowWithKey(r: DepartmentSalaryReportRow, index: number): DepartmentSalaryRowWithKey {
  return {
    ...r,
    key: `${r.departmentName}\t${r.positionName}\t${r.employeeName}\t${index}`,
  };
}

export interface UseDepartmentSalaryTableParams {
  rows: DepartmentSalaryReportRow[];
  departmentFilter: string[];
}

export interface UseDepartmentSalaryTableResult {
  filteredRows: DepartmentSalaryRowWithKey[];
  tableRows: DepartmentSalaryTableRow[];
  totals: DepartmentSalaryTotals;
}

export function useDepartmentSalaryTable(
  params: UseDepartmentSalaryTableParams
): UseDepartmentSalaryTableResult {
  const { rows, departmentFilter } = params;

  const rowsWithKey = useMemo(
    () => rows.map((r, i) => toRowWithKey(r, i)),
    [rows]
  );

  const filteredRows = useMemo(() => {
    if (departmentFilter.length === 0) return rowsWithKey;
    return rowsWithKey.filter((r) => departmentFilter.includes(r.departmentName));
  }, [rowsWithKey, departmentFilter]);

  const tableRows = useMemo((): DepartmentSalaryTableRow[] => {
    const byDept = new Map<string, DepartmentSalaryRowWithKey[]>();
    for (const r of filteredRows) {
      const list = byDept.get(r.departmentName) ?? [];
      list.push(r);
      byDept.set(r.departmentName, list);
    }
    const result: DepartmentSalaryTableRow[] = [];
    const deptNames = Array.from(byDept.keys()).sort();
    for (const dept of deptNames) {
      const list = byDept.get(dept)!;
      const deptHours = list.reduce((s, r) => s + r.hours, 0);
      const deptSalary = list.reduce((s, r) => s + r.salary, 0);
      result.push({
        type: 'group',
        key: `group-${dept}`,
        departmentName: dept,
        hours: deptHours,
        salary: deptSalary,
      });
      for (const r of list) {
        result.push({
          type: 'employee',
          key: r.key,
          departmentName: '',
          positionName: r.positionName,
          employeeName: r.employeeName,
          hourlyRate: r.hourlyRate,
          hours: r.hours,
          salary: r.salary,
        });
      }
    }
    return result;
  }, [filteredRows]);

  const totals = useMemo(
    (): DepartmentSalaryTotals =>
      filteredRows.reduce(
        (acc, r) => ({
          count: acc.count + 1,
          hours: acc.hours + r.hours,
          salary: acc.salary + r.salary,
        }),
        { count: 0, hours: 0, salary: 0 }
      ),
    [filteredRows]
  );

  return { filteredRows, tableRows, totals };
}
