import prisma from '@/lib/prisma.js';
import { fetchOlapReportV2 } from '@/lib/iikoClient.js';
import IikoCredentialsService from '@/modules/iiko-credentials/iiko-credentials.service.js';
import { HttpNotFoundError } from '@/lib/errors.js';

function normalizeHostKey(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || url;
}

const DEPARTMENT_KEYS = ['Department', 'department'];
const DEPARTMENT_ID_KEYS = ['Department.Id', 'department.id', 'DepartmentID'];

function extractPointsFromOlap(raw: string): { name: string; departmentId?: string }[] {
  const data = JSON.parse(raw) as Record<string, unknown>;
  const report = (data.report ?? data) as Record<string, unknown>;
  let rows: unknown[] = [];
  if (Array.isArray(report?.rows)) rows = report.rows;
  else if (Array.isArray(report?.row)) rows = report.row;
  else if (Array.isArray((report as Record<string, unknown>)?.data))
    rows = (report as Record<string, unknown>).data as unknown[];
  else if (Array.isArray(data.rows)) rows = data.rows as unknown[];
  else if (Array.isArray(data.row)) rows = data.row as unknown[];
  else if (Array.isArray(data.data)) rows = data.data as unknown[];
  const map = new Map<string, string | undefined>(); // name -> departmentId
  for (const r of rows) {
    let name = '';
    let depId: string | undefined;
    if (Array.isArray(r)) {
      // Ожидаем порядок [Department, Department.Id, ...]
      name = r[0] != null ? String(r[0]).trim() : '';
      if (r[1] != null) depId = String(r[1]).trim();
    } else if (r && typeof r === 'object') {
      const row = r as Record<string, unknown>;
      const v = DEPARTMENT_KEYS.map((k) => row[k]).find((x) => x != null && String(x).trim() !== '');
      name = v != null ? String(v).trim() : '';
      const idVal = DEPARTMENT_ID_KEYS.map((k) => row[k]).find((x) => x != null && String(x).trim() !== '');
      if (idVal != null) depId = String(idVal).trim();
    }
    if (!name) continue;
    const key = name;
    if (!map.has(key)) map.set(key, depId);
  }
  return Array.from(map.entries()).map(([n, id]) => ({ name: n, departmentId: id }));
}

export type PointDepartmentLink = { pointName: string; departmentId: string; departmentName?: string };

export default class PointsService {
  private iikoCreds = new IikoCredentialsService();

  async listPoints(companyId: string): Promise<string[]> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) return [];
    const hostKey = normalizeHostKey(creds.serverUrl);
    const rows = await prisma.companyPoint.findMany({
      where: { companyId, hostKey },
      orderBy: { pointName: 'asc' },
      select: { pointName: true },
    });
    return rows.map((r) => r.pointName);
  }

  async syncPoints(companyId: string): Promise<string[]> {
    const { serverUrl, token, hostKey } = await this.iikoCreds.getToken(companyId);
    const to = new Date();
    const from = new Date(to.getFullYear() - 2, to.getMonth(), to.getDate());
    const fromStr = `${String(from.getDate()).padStart(2, '0')}.${String(from.getMonth() + 1).padStart(2, '0')}.${from.getFullYear()}`;
    const toStr = `${String(to.getDate()).padStart(2, '0')}.${String(to.getMonth() + 1).padStart(2, '0')}.${to.getFullYear()}`;
    const raw = await fetchOlapReportV2(serverUrl, token, {
      report: 'SALES',
      from: fromStr,
      to: toStr,
      groupByRowFields: ['Department', 'Department.Id'] as const,
      aggregateFields: ['DishSumInt'] as const,
    });
    const points = extractPointsFromOlap(raw).sort((a, b) => a.name.localeCompare(b.name));

    await prisma.companyPoint.deleteMany({ where: { companyId, hostKey } });
    for (const p of points) {
      await prisma.companyPoint.create({
        data: {
          companyId,
          hostKey,
          pointName: p.name,
          departmentId: p.departmentId ?? undefined,
        },
      });
    }
    return points.map((p) => p.name);
  }

  async listPointDepartmentLinks(companyId: string): Promise<PointDepartmentLink[]> {
    // Таблица связей точка↔подразделение удалена; возвращаем пустой список для совместимости API.
    void companyId;
    return [];
  }

  async setPointDepartment(
    companyId: string,
    pointName: string,
    departmentId: string
  ): Promise<PointDepartmentLink> {
    // Связи точка↔подразделение больше не поддерживаются; считаем, что точка привязана ко всем подразделениям.
    void companyId;
    return { pointName, departmentId, departmentName: undefined };
  }

  async unsetPointDepartment(companyId: string, pointName: string): Promise<void> {
    // Ничего не делаем: явных связей больше нет.
    void companyId;
    void pointName;
  }

  async deletePoint(companyId: string, pointName: string): Promise<void> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) throw new HttpNotFoundError('iiko credentials not set');
    const hostKey = normalizeHostKey(creds.serverUrl);
    const pointNameTrimmed = String(pointName).trim();
    await prisma.companyPoint.deleteMany({
      where: { companyId, hostKey, pointName: pointNameTrimmed },
    });
  }
}
