import { type NextFunction, type Request } from 'express';
import PayTypesService from './pay-types.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';

export default class PayTypesController extends Api {
  private readonly service = new PayTypesService();

  list = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const list = await this.service.list(req.user.companyId);
      this.send(res, list, 200, 'success');
    } catch (e) {
      next(e);
    }
  };

  sync = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const list = await this.service.sync(req.user.companyId);
      this.send(res, { count: list.length, list }, 200, 'success');
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
      const payType = (req.body?.payType ?? req.body?.value ?? req.query.payType) as string;
      const ok = await this.service.delete(req.user.companyId, payType ?? '');
      this.send(res, { ok }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}
