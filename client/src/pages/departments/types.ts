export interface Department {
  id: string;
  name: string;
  priority?: number;
  productGroupValues?: string[] | null;
}

export interface Position {
  id: string;
  name: string;
  priority?: number;
}

export interface PointLink {
  pointName: string;
  departmentId: string;
  departmentName?: string;
}
