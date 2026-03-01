import prisma from '@/lib/prisma.js';
import { fetchOlapReportV2 } from '@/lib/iikoClient.js';
import IikoCredentialsService from '@/modules/iiko-credentials/iiko-credentials.service.js';
import { HttpNotFoundError } from '@/lib/errors.js';

function normalizeHostKey(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || url;
}

const DEPARTMENT_KEYS = ['Department', 'department'];

function extractPointNamesFromOlap(raw: string): string[] {
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
  const set = new Set<string>();
  for (const r of rows) {
    let val = '';
    if (Array.isArray(r)) {
      val = r[0] != null ? String(r[0]).trim() : '';
    } else if (r && typeof r === 'object') {
      const row = r as Record<string, unknown>;
      const v = DEPARTMENT_KEYS.map((k) => row[k]).find((x) => x != null && String(x).trim() !== '');
      val = v != null ? String(v).trim() : '';
    }
    if (val) set.add(val);
  }
  return Array.from(set);
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
      groupByRowFields: ['Department'] as const,
      aggregateFields: ['DishSumInt'] as const,
    });
    const pointNames = extractPointNamesFromOlap(raw).sort();
    await prisma.companyPoint.deleteMany({ where: { companyId, hostKey } });
    for (const pointName of pointNames) {
      await prisma.companyPoint.create({
        data: { companyId, hostKey, pointName },
      });
    }
    return pointNames;
  }

  async listPointDepartmentLinks(companyId: string): Promise<PointDepartmentLink[]> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) return [];
    const hostKey = normalizeHostKey(creds.serverUrl);
    const rows = await prisma.companyPointDepartment.findMany({
      where: { companyId, hostKey },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { pointName: 'asc' },
    });
    return rows.map((r) => ({
      pointName: r.pointName,
      departmentId: r.departmentId,
      departmentName: r.department.name,
    }));
  }

  async setPointDepartment(
    companyId: string,
    pointName: string,
    departmentId: string
  ): Promise<PointDepartmentLink> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) throw new HttpNotFoundError('iiko credentials not set');
    const hostKey = normalizeHostKey(creds.serverUrl);
    const department = await prisma.department.findFirst({
      where: { id: departmentId, companyId },
    });
    if (!department) throw new HttpNotFoundError('Department not found');
    const pointNameTrimmed = String(pointName).trim();
    const existing = await prisma.companyPointDepartment.findUnique({
      where: {
        companyId_hostKey_pointName: { companyId, hostKey, pointName: pointNameTrimmed },
      },
      include: { department: { select: { name: true } } },
    });
    if (existing) {
      await prisma.companyPointDepartment.update({
        where: { id: existing.id },
        data: { departmentId },
      });
    } else {
      await prisma.companyPoint.upsert({
        where: {
          companyId_hostKey_pointName: { companyId, hostKey, pointName: pointNameTrimmed },
        },
        create: { companyId, hostKey, pointName: pointNameTrimmed },
        update: {},
      });
      await prisma.companyPointDepartment.create({
        data: { companyId, hostKey, pointName: pointNameTrimmed, departmentId },
      });
    }
    return { pointName: pointNameTrimmed, departmentId, departmentName: department.name };
  }

  async unsetPointDepartment(companyId: string, pointName: string): Promise<void> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) throw new HttpNotFoundError('iiko credentials not set');
    const hostKey = normalizeHostKey(creds.serverUrl);
    await prisma.companyPointDepartment.deleteMany({
      where: { companyId, hostKey, pointName: String(pointName).trim() },
    });
  }

  async deletePoint(companyId: string, pointName: string): Promise<void> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) throw new HttpNotFoundError('iiko credentials not set');
    const hostKey = normalizeHostKey(creds.serverUrl);
    const pointNameTrimmed = String(pointName).trim();
    await prisma.companyPointDepartment.deleteMany({
      where: { companyId, hostKey, pointName: pointNameTrimmed },
    });
    await prisma.companyPoint.deleteMany({
      where: { companyId, hostKey, pointName: pointNameTrimmed },
    });
  }
}
