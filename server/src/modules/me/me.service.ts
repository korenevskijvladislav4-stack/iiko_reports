import prisma from '@/lib/prisma.js';
import { HttpNotFoundError } from '@/lib/errors.js';

export default class MeService {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        scheduleAccessRole: true,
        includeInSchedule: true,
        company: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new HttpNotFoundError('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      scheduleAccessRole: user.scheduleAccessRole,
      includeInSchedule: user.includeInSchedule,
      company: user.company,
    };
  }
}
