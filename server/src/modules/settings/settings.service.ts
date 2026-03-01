import prisma from '@/lib/prisma.js';
import IikoCredentialsService from '@/modules/iiko-credentials/iiko-credentials.service.js';
import { HttpNotFoundError } from '@/lib/errors.js';

export type HostFilters = {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  deliveryFilter?: string;
  selectedDepartments?: string[];
  selectedPayTypes?: string[];
  departmentOrder?: string[];
};

export default class SettingsService {
  private iikoCreds = new IikoCredentialsService();

  async getFilters(companyId: string, userId: string): Promise<HostFilters | null> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) return null;
    const hostKey = creds.serverUrl.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || creds.serverUrl;
    const row = await prisma.userReportFilter.findUnique({
      where: { userId_hostKey: { userId, hostKey } },
    });
    if (!row || !row.filters) return null;
    return row.filters as HostFilters;
  }

  async setFilters(companyId: string, userId: string, filters: HostFilters): Promise<void> {
    const creds = await this.iikoCreds.getHashed(companyId);
    if (!creds) throw new HttpNotFoundError('Set iiko credentials first');
    const hostKey = creds.serverUrl.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || creds.serverUrl;
    await prisma.userReportFilter.upsert({
      where: { userId_hostKey: { userId, hostKey } },
      create: { userId, hostKey, filters: filters ?? {} },
      update: { filters: filters ?? {} },
    });
  }
}
