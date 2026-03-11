import { type NextFunction, type Request } from 'express';
import DepartmentSalaryService from './department-salary.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';

export default class DepartmentSalaryController extends Api {
  private readonly service = new DepartmentSalaryService();

  getReport = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.send(res, { error: 'Unauthorized' }, 401, 'error');
        return;
      }
      const { from, to } = req.query as { from?: string; to?: string };
      const rows = await this.service.getReport(req.user.companyId, from ?? '', to ?? '');
      this.send(res, { rows }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}

