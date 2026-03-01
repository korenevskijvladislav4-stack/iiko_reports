import prisma from '@/lib/prisma.js';
import { HttpNotFoundError } from '@/lib/errors.js';

export default class PositionsService {
  async list(companyId: string) {
    return prisma.position.findMany({
      where: { companyId },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
  }

  async create(companyId: string, name: string, priority?: number) {
    return prisma.position.create({
      data: {
        companyId,
        name: name.trim(),
        priority: typeof priority === 'number' ? priority : 0,
      },
    });
  }

  async update(companyId: string, id: string, name: string, priority?: number) {
    await this.getOne(companyId, id);
    const data: { name?: string; priority?: number } = { name: name.trim() };
    if (priority !== undefined) data.priority = priority;
    return prisma.position.update({
      where: { id },
      data,
    });
  }

  async delete(companyId: string, id: string) {
    await this.getOne(companyId, id);
    return prisma.position.delete({ where: { id } });
  }

  async getOne(companyId: string, id: string) {
    const row = await prisma.position.findFirst({
      where: { id, companyId },
    });
    if (!row) throw new HttpNotFoundError('Position not found');
    return row;
  }
}
