import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma.js';
import { HttpBadRequestError, HttpForbiddenError, HttpNotFoundError } from '@/lib/errors.js';

const SALT_ROUNDS = 10;

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role?: string;
  scheduleAccessRole?: string;
  includeInSchedule?: boolean;
  departmentId?: string | null;
  positionId?: string | null;
  hourlyRate?: number | null;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  scheduleAccessRole?: string;
  includeInSchedule?: boolean;
  departmentId?: string | null;
  positionId?: string | null;
  hourlyRate?: number | null;
};

export default class UsersService {
  async list(companyId: string, filters?: { includeInSchedule?: boolean; departmentId?: string }) {
    const where: { companyId: string; includeInSchedule?: boolean; departmentId?: string | null } = { companyId };
    if (filters?.includeInSchedule === true) where.includeInSchedule = true;
    if (filters?.departmentId !== undefined) {
      where.departmentId = filters.departmentId === '__none__' ? null : filters.departmentId;
    }
    return prisma.user.findMany({
      where,
      include: { department: true, position: true },
      orderBy: { name: 'asc' },
    });
  }

  private canManageUsers(role: string, scheduleAccessRole?: string): boolean {
    return ['owner', 'admin'].includes(role) || (role === 'staff' && scheduleAccessRole === 'manager');
  }

  async create(companyId: string, currentUserRole: string, data: CreateUserInput, scheduleAccessRole?: string) {
    if (!this.canManageUsers(currentUserRole, scheduleAccessRole)) {
      throw new HttpForbiddenError('Недостаточно прав для создания пользователей');
    }
    const email = data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpBadRequestError('Email already registered');
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    return prisma.user.create({
      data: {
        companyId,
        email,
        passwordHash,
        name: data.name.trim(),
        role: data.role ?? 'staff',
        scheduleAccessRole: data.scheduleAccessRole ?? 'none',
        includeInSchedule: data.includeInSchedule ?? false,
        departmentId: data.departmentId || null,
        positionId: data.positionId || null,
        hourlyRate: typeof data.hourlyRate === 'number' ? data.hourlyRate : null,
      },
      include: { department: true, position: true },
    });
  }

  async update(companyId: string, currentUserRole: string, id: string, data: UpdateUserInput, scheduleAccessRole?: string) {
    if (!this.canManageUsers(currentUserRole, scheduleAccessRole)) {
      throw new HttpForbiddenError('Недостаточно прав для редактирования пользователей');
    }
    await this.getOne(companyId, id);
    const updateData: Record<string, unknown> = {};
    if (data.name != null) updateData.name = data.name.trim();
    if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
    if (data.password != null) updateData.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    if (data.role !== undefined) updateData.role = data.role;
    if (data.scheduleAccessRole !== undefined) updateData.scheduleAccessRole = data.scheduleAccessRole;
    if (data.includeInSchedule !== undefined) updateData.includeInSchedule = data.includeInSchedule;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId || null;
    if (data.positionId !== undefined) updateData.positionId = data.positionId || null;
    if (data.hourlyRate !== undefined) updateData.hourlyRate = typeof data.hourlyRate === 'number' ? data.hourlyRate : null;
    if (data.email !== undefined) {
      const existing = await prisma.user.findFirst({
        where: { email: data.email!.trim().toLowerCase(), NOT: { id } },
      });
      if (existing) throw new HttpBadRequestError('Email already in use');
    }
    return prisma.user.update({
      where: { id },
      data: updateData as any,
      include: { department: true, position: true },
    });
  }

  async delete(companyId: string, currentUserRole: string, id: string, scheduleAccessRole?: string) {
    if (!this.canManageUsers(currentUserRole, scheduleAccessRole)) {
      throw new HttpForbiddenError('Недостаточно прав для удаления пользователей');
    }
    await this.getOne(companyId, id);
    return prisma.user.delete({ where: { id } });
  }

  async getOne(companyId: string, id: string) {
    const row = await prisma.user.findFirst({
      where: { id, companyId },
      include: { department: true, position: true },
    });
    if (!row) throw new HttpNotFoundError('User not found');
    return row;
  }
}
