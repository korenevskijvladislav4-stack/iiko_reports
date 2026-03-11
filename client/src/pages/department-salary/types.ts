/** Строка отчёта зарплаты по подразделениям (ответ API) */
export interface DepartmentSalaryReportRow {
  departmentName: string;
  positionName: string | null;
  employeeName: string;
  hourlyRate: number;
  hours: number;
  salary: number;
}

/** Параметры запроса отчёта */
export interface DepartmentSalaryReportParams {
  from: string;
  to: string;
}

/** Строка таблицы с ключом для React */
export interface DepartmentSalaryRowWithKey extends DepartmentSalaryReportRow {
  key: string;
}

/** Строка таблицы: группа подразделения или сотрудник */
export type DepartmentSalaryTableRow =
  | {
      type: 'group';
      key: string;
      departmentName: string;
      positionName?: never;
      employeeName?: never;
      hourlyRate?: never;
      hours: number;
      salary: number;
    }
  | {
      type: 'employee';
      key: string;
      departmentName: string;
      positionName: string | null;
      employeeName: string;
      hourlyRate: number;
      hours: number;
      salary: number;
    };

/** Итоги по отфильтрованным данным */
export interface DepartmentSalaryTotals {
  count: number;
  hours: number;
  salary: number;
}

/** Элемент справочника подразделений для селекта */
export interface DepartmentOption {
  id: string;
  name: string;
}
