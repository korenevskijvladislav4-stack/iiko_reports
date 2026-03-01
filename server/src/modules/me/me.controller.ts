import { type NextFunction, type Request } from 'express';
import MeService from './me.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';

export default class MeController extends Api {
  private readonly meService = new MeService();

  get = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const data = await this.meService.getMe(req.user.userId);
      this.send(res, data, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}
