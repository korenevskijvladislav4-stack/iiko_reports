import { type NextFunction, type Request } from 'express';
import PointsService, { type PointDepartmentLink } from './points.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';
import { HttpBadRequestError } from '@/lib/errors.js';

export default class PointsController extends Api {
  private readonly service = new PointsService();

  listPoints = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const list = await this.service.listPoints(req.user.companyId);
      this.send(res, list, 200, 'success');
    } catch (e) {
      next(e);
    }
  };

  syncPoints = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const list = await this.service.syncPoints(req.user.companyId);
      this.send(res, { count: list.length, list }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };

  listPointDepartmentLinks = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const list = await this.service.listPointDepartmentLinks(req.user.companyId);
      this.send(res, list, 200, 'success');
    } catch (e) {
      next(e);
    }
  };

  setPointDepartment = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const pointName = req.body?.pointName as string | undefined;
      const departmentId = req.body?.departmentId as string | undefined;
      if (!pointName || typeof pointName !== 'string' || !departmentId || typeof departmentId !== 'string') {
        next(new HttpBadRequestError('pointName and departmentId required'));
        return;
      }
      const link: PointDepartmentLink = await this.service.setPointDepartment(
        req.user.companyId,
        pointName,
        departmentId
      );
      this.send(res, link, 200, 'success');
    } catch (e) {
      next(e);
    }
  };

  unsetPointDepartment = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const pointName = (req.body?.pointName ?? req.query.pointName) as string;
      if (!pointName || typeof pointName !== 'string') {
        next(new HttpBadRequestError('pointName required'));
        return;
      }
      await this.service.unsetPointDepartment(req.user.companyId, pointName);
      this.send(res, { ok: true }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };

  deletePoint = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const pointName = (req.body?.pointName ?? req.query.pointName) as string;
      if (!pointName || typeof pointName !== 'string') {
        next(new HttpBadRequestError('pointName required'));
        return;
      }
      await this.service.deletePoint(req.user.companyId, pointName);
      this.send(res, { ok: true }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}
