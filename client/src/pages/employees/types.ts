export interface DepartmentOption {
  id: string;
  name: string;
}

export interface PositionOption {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  scheduleAccessRole: string;
  includeInSchedule: boolean;
  departmentId?: string | null;
  positionId?: string | null;
  hourlyRate?: number | null;
}

export interface UserWithNames extends User {
  departmentName: string;
  positionName: string;
}
