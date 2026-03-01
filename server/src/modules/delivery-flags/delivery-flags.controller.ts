import { type NextFunction, type Request } from 'express';
import DeliveryFlagsService from './delivery-flags.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';

export default class DeliveryFlagsController extends Api {
  private readonly service = new DeliveryFlagsService();

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
      const value = (req.body?.value ?? req.query.value) as string;
      await this.service.delete(req.user.companyId, value ?? '');
      this.send(res, { ok: true }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}
