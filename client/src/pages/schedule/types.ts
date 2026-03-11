export interface Department {
  id: string;
  name: string;
  priority?: number;
}

export interface Position {
  id: string;
  name: string;
  priority?: number;
}

export interface User {
  id: string;
  name: string;
  includeInSchedule: boolean;
  departmentId?: string | null;
  department?: Department | null;
  position?: Position | null;
}

export interface Schedule {
  id: string;
  userId: string;
  companyId: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
}

export interface MatrixRow {
  key: string;
  userId?: string;
  userName?: string;
  isGroup?: boolean;
  departmentName?: string;
  departmentId?: string;
  departmentPriority?: number;
  [dateKey: string]: string | number | boolean | undefined;
}
