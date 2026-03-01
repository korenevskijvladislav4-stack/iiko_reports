import { type NextFunction, type Request } from 'express';
import IikoCredentialsService from './iiko-credentials.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';

export default class IikoCredentialsController extends Api {
  private readonly service = new IikoCredentialsService();

  get = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new Error('Unauthorized'));
      const data = await this.service.get(req.user.companyId);
      this.send(res, data, 200, 'success');
    } catch (e) {
      next(e);
    }
  };

  put = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new Error('Unauthorized'));
      await this.service.save(req.user.companyId, req.body);
      this.send(res, { ok: true }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}
