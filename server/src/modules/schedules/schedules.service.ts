import prisma from '@/lib/prisma.js';
import { HttpNotFoundError } from '@/lib/errors.js';

export type CreateScheduleInput = {
  userId: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  notes?: string;
};

export type UpdateScheduleInput = {
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
};

export default class SchedulesService {
  async list(companyId: string, filters?: { userId?: string; from?: string; to?: string; departmentId?: string }) {
    const where: {
      companyId: string;
      userId?: string;
      date?: { gte?: Date; lte?: Date };
      user?: { departmentId?: string | null };
    } = { companyId };
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.from || filters?.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }
    if (filters?.departmentId !== undefined) {
      where.user = {
        departmentId: filters.departmentId === '__none__' ? null : filters.departmentId,
      };
    }
    return prisma.userSchedule.findMany({
      where,
      include: { user: { include: { department: true, position: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async create(companyId: string, data: CreateScheduleInput) {
    await this.ensureUserInCompany(companyId, data.userId);
    const date = new Date(data.date);
    return prisma.userSchedule.create({
      data: {
        companyId,
        userId: data.userId,
        date,
        startTime: data.startTime?.trim() || null,
        endTime: data.endTime?.trim() || null,
        notes: data.notes?.trim() || null,
      },
      include: { user: { include: { department: true, position: true } } },
    });
  }

  async update(companyId: string, id: string, data: UpdateScheduleInput) {
    await this.getOne(companyId, id);
    return prisma.userSchedule.update({
      where: { id },
      data: {
        ...(data.date != null && { date: new Date(data.date) }),
        ...(data.startTime !== undefined && { startTime: data.startTime?.trim() || null }),
        ...(data.endTime !== undefined && { endTime: data.endTime?.trim() || null }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
      },
      include: { user: { include: { department: true, position: true } } },
    });
  }

  async delete(companyId: string, id: string) {
    await this.getOne(companyId, id);
    return prisma.userSchedule.delete({ where: { id } });
  }

  async getOne(companyId: string, id: string) {
    const row = await prisma.userSchedule.findFirst({
      where: { id, companyId },
      include: { user: { include: { department: true, position: true } } },
    });
    if (!row) throw new HttpNotFoundError('Schedule not found');
    return row;
  }

  private async ensureUserInCompany(companyId: string, userId: string) {
    const u = await prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!u) throw new HttpNotFoundError('User not found');
  }
}
