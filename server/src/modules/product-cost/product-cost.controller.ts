import { type NextFunction, type Request } from 'express';
import ProductCostService from './product-cost.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';
import { HttpBadRequestError } from '@/lib/errors.js';

export default class ProductCostController extends Api {
  private readonly service = new ProductCostService();

  getReport = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const from = (req.query.from ?? req.body?.from) as string | undefined;
      const to = (req.query.to ?? req.body?.to) as string | undefined;
      if (!from || !to) {
        next(new HttpBadRequestError('from and to required (YYYY-MM-DD)'));
        return;
      }
      const { rows, totalDepartmentSalary } = await this.service.getReport(req.user.companyId, from, to);
      this.send(res, { rows, totalDepartmentSalary }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}
