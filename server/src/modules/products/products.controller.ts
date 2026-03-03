import { type NextFunction, type Request } from 'express';
import ProductsService from './products.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';

export default class ProductsController extends Api {
  private readonly service = new ProductsService();

  list = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const rows = await this.service.mapById(req.user.companyId);
      const list = Array.from(rows.entries()).map(([productId, name]) => ({ productId, name }));
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
      await this.service.sync(req.user.companyId);
      this.send(res, { ok: true }, 200, 'success');
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
      const { productId } = (req.body ?? {}) as { productId?: string };
      if (!productId) {
        this.send(res, { ok: false }, 400, 'error');
        return;
      }
      // Мягкое удаление: убираем из локального справочника, данные в iiko не трогаем
      await this.service.delete(req.user.companyId, productId);
      this.send(res, { ok: true }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}

