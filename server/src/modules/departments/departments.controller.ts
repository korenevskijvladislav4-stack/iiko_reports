import { type NextFunction, type Request } from 'express';
import DepartmentsService from './departments.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';
import { HttpBadRequestError } from '@/lib/errors.js';

export default class DepartmentsController extends Api {
  private readonly service = new DepartmentsService();

  list = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const data = await this.service.list(req.user.companyId);
      this.send(res, data, 200, 'success');
    } catch (e) {
      next(e);
    }
  };

  create = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const name = req.body?.name;
      const priority = req.body?.priority;
      const productGroupValues = req.body?.productGroupValues as string[] | null | undefined;
      if (!name || typeof name !== 'string') {
        next(new HttpBadRequestError('name required'));
        return;
      }
      const data = await this.service.create(
        req.user.companyId,
        name,
        typeof priority === 'number' ? priority : undefined,
        Array.isArray(productGroupValues) ? productGroupValues : productGroupValues === null ? null : undefined
      );
      this.send(res, data, 201, 'created');
    } catch (e) {
      next(e);
    }
  };

  update = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const id = req.params.id;
      const name = req.body?.name;
      const priority = req.body?.priority;
      const productGroupValues = req.body?.productGroupValues as string[] | null | undefined;
      if (!id || !name || typeof name !== 'string') {
        next(new HttpBadRequestError('id and name required'));
        return;
      }
      const data = await this.service.update(
        req.user.companyId,
        id,
        name,
        typeof priority === 'number' ? priority : undefined,
        Array.isArray(productGroupValues) ? productGroupValues : productGroupValues === null ? null : undefined
      );
      this.send(res, data, 200, 'success');
    } catch (e) {
      next(e);
    }
  };

  delete = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const id = req.params.id;
      if (!id) {
        next(new HttpBadRequestError('id required'));
        return;
      }
      await this.service.delete(req.user.companyId, id);
      this.send(res, { ok: true }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}
