import { type NextFunction, type Request } from 'express';
import SettingsService from './settings.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';

export default class SettingsController extends Api {
  private readonly service = new SettingsService();

  getFilters = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const filters = await this.service.getFilters(req.user.companyId, req.user.userId);
      this.send(res, filters ?? {}, 200, 'success');
    } catch (e) {
      next(e);
    }
  };

  setFilters = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const filters = req.body?.filters ?? req.body ?? {};
      await this.service.setFilters(req.user.companyId, req.user.userId, filters);
      this.send(res, { ok: true }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}
