import { type NextFunction, type Request } from 'express';
import SchedulesService from './schedules.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';
import { HttpBadRequestError } from '@/lib/errors.js';

export default class SchedulesController extends Api {
  private readonly service = new SchedulesService();

  list = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const userId = req.query.userId as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const departmentId = (req.query.departmentId as string) || undefined;
      const data = await this.service.list(req.user.companyId, { userId, from, to, departmentId });
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
      const { userId, date, startTime, endTime, notes } = req.body ?? {};
      if (!userId || !date) {
        next(new HttpBadRequestError('userId and date required'));
        return;
      }
      const data = await this.service.create(req.user.companyId, {
        userId,
        date,
        startTime,
        endTime,
        notes,
      });
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
      const { date, startTime, endTime, notes } = req.body ?? {};
      const data = await this.service.update(req.user.companyId, id, {
        date,
        startTime,
        endTime,
        notes,
      });
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
