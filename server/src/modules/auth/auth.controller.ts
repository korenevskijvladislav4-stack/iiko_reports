import { type NextFunction, type Request } from 'express';
import AuthService from './auth.service.js';
import Api from '@/lib/api.js';
import type { CustomResponse } from '@/types/common.type.js';

export default class AuthController extends Api {
  private readonly authService = new AuthService();

  register = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      this.send(res, result, 201, 'registered');
    } catch (e) {
      next(e);
    }
  };

  login = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      this.send(res, result, 200, 'success');
    } catch (e) {
      next(e);
    }
  };

  /** POST /auth/token — проверка кредов iiko (возвращает токен iiko). */
  iikoToken = async (req: Request, res: CustomResponse, next: NextFunction): Promise<void> => {
    try {
      const { serverUrl, login, password } = req.body ?? {};
      if (!serverUrl || !login || !password) {
        this.send(res, { error: 'serverUrl, login and password required' }, 400, 'error');
        return;
      }
      const token = await this.authService.getIikoToken(serverUrl, login, password);
      this.send(res, { token }, 200, 'success');
    } catch (e) {
      next(e);
    }
  };
}
