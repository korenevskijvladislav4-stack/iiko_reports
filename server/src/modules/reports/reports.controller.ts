import { type NextFunction, type Request } from 'express';
import ReportsService from './reports.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';
import { HttpBadRequestError } from '@/lib/errors.js';

export default class ReportsController extends Api {
  private readonly service = new ReportsService();

  olap = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const body = req.body ?? {};
      const { report, from, to, groupByRowFields, groupByColFields, aggregateFields, filters } = body;
      if (!report || !from || !to) {
        next(new HttpBadRequestError('report, from and to required'));
        return;
      }
      const data = await this.service.getOlapReport(req.user.companyId, {
        report,
        from,
        to,
        groupByRowFields,
        groupByColFields,
        aggregateFields,
        filters,
      });
      this.send(res, data, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}
