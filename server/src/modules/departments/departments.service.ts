import prisma from '@/lib/prisma.js';
import { Prisma } from '@prisma/client';
import { HttpNotFoundError } from '@/lib/errors.js';

export default class DepartmentsService {
  async list(companyId: string) {
    return prisma.department.findMany({
      where: { companyId },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
  }

  async create(
    companyId: string,
    name: string,
    priority?: number,
    productGroupValues?: string[] | null
  ) {
    return prisma.department.create({
      data: {
        companyId,
        name: name.trim(),
        priority: typeof priority === 'number' ? priority : 0,
        productGroupValues: productGroupValues ?? undefined,
      },
    });
  }

  async update(
    companyId: string,
    id: string,
    name: string,
    priority?: number,
    productGroupValues?: string[] | null
  ) {
    await this.getOne(companyId, id);
    const data: { name?: string; priority?: number; productGroupValues?: string[] | typeof Prisma.JsonNull } = {
      name: name.trim(),
    };
    if (priority !== undefined) data.priority = priority;
    if (productGroupValues !== undefined)
      data.productGroupValues = productGroupValues === null ? Prisma.JsonNull : productGroupValues;
    return prisma.department.update({
      where: { id },
      data,
    });
  }

  async delete(companyId: string, id: string) {
    await this.getOne(companyId, id);
    return prisma.department.delete({ where: { id } });
  }

  async getOne(companyId: string, id: string) {
    const row = await prisma.department.findFirst({
      where: { id, companyId },
    });
    if (!row) throw new HttpNotFoundError('Department not found');
    return row;
  }
}
