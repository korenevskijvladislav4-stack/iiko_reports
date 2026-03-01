import { type NextFunction, type Request } from 'express';
import UsersService from './users.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';
import { HttpBadRequestError } from '@/lib/errors.js';

export default class UsersController extends Api {
  private readonly service = new UsersService();

  list = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const includeInSchedule = req.query.includeInSchedule === 'true' ? true : undefined;
      const departmentId = (req.query.departmentId as string) || undefined;
      const data = await this.service.list(req.user.companyId, { includeInSchedule, departmentId });
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
      const { name, email, password, role, scheduleAccessRole, includeInSchedule, departmentId, positionId, hourlyRate } = req.body ?? {};
      if (!name?.trim() || !email?.trim() || !password) {
        next(new HttpBadRequestError('name, email and password required'));
        return;
      }
      const data = await this.service.create(req.user.companyId, req.user.role ?? '', {
        name,
        email,
        password,
        role,
        scheduleAccessRole,
        includeInSchedule,
        departmentId,
        positionId,
        hourlyRate,
      }, req.user.scheduleAccessRole);
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
      if (!id) {
        next(new HttpBadRequestError('id required'));
        return;
      }
      const { name, email, password, role, scheduleAccessRole, includeInSchedule, departmentId, positionId, hourlyRate } = req.body ?? {};
      const data = await this.service.update(req.user.companyId, req.user.role ?? '', id, {
        name,
        email,
        password,
        role,
        scheduleAccessRole,
        includeInSchedule,
        departmentId,
        positionId,
        hourlyRate,
      }, req.user.scheduleAccessRole);
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
      await this.service.delete(req.user.companyId, req.user.role ?? '', id, req.user.scheduleAccessRole);
      this.send(res, { ok: true }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}
