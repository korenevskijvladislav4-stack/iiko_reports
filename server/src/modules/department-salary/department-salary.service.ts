import prisma from '@/lib/prisma.js';
import { HttpBadRequestError } from '@/lib/errors.js';

function parseTimeToMinutes(t: string | null | undefined): number {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!parts) return 0;
  const hours = parseInt(parts[1], 10);
  const minutes = parseInt(parts[2], 10);
  const seconds = parts[3] ? parseInt(parts[3], 10) : 0;
  return hours * 60 + minutes + seconds / 60;
}

function hoursBetween(startTime: string | null | undefined, endTime: string | null | undefined): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (end >= start) return (end - start) / 60;
  return (24 * 60 - start + end) / 60;
}

function ddMmYyyyToIso(s: string): string {
  const [d, m, y] = s.trim().split(/\./).map(Number);
  if (!d || !m || !y) return s;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export type DepartmentSalaryRow = {
  departmentName: string;
  positionName: string | null;
  employeeName: string;
  hourlyRate: number;
  hours: number;
  salary: number;
};

export default class DepartmentSalaryService {
  async getReport(companyId: string, from: string, to: string): Promise<DepartmentSalaryRow[]> {
    if (!from || !to) throw new HttpBadRequestError('from and to required (YYYY-MM-DD or DD.MM.YYYY)');
    const fromIso = from.includes('.') ? ddMmYyyyToIso(from) : from;
    const toIso = to.includes('.') ? ddMmYyyyToIso(to) : to;

    const schedules = await prisma.userSchedule.findMany({
      where: {
        companyId,
        date: { gte: new Date(fromIso), lte: new Date(toIso) },
      },
      select: { userId: true, startTime: true, endTime: true },
    });

    const hoursByUser = new Map<string, number>();
    for (const s of schedules) {
      const h = hoursBetween(s.startTime, s.endTime);
      if (h <= 0) continue;
      hoursByUser.set(s.userId, (hoursByUser.get(s.userId) ?? 0) + h);
    }

    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        hourlyRate: true,
        department: { select: { name: true } },
        position: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const rows: DepartmentSalaryRow[] = [];
    for (const u of users) {
      const hours = hoursByUser.get(u.id) ?? 0;
      const rate = u.hourlyRate ?? 0;
      const salary = hours * rate;
      const departmentName = u.department?.name ?? 'Без подразделения';
      const positionName = u.position?.name ?? null;
      rows.push({
        departmentName,
        positionName,
        employeeName: u.name,
        hourlyRate: rate,
        hours,
        salary,
      });
    }

    return rows;
  }
}

