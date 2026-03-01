import { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { HttpForbiddenError, HttpUnauthorizedError } from '@/lib/errors.js';
import type { JwtPayload } from '@/types/common.type.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production';

/** Требует одну из ролей. Использовать после verifyAuthToken. */
export function requireRole(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpUnauthorizedError('Unauthorized'));
      return;
    }
    if (!roles.includes(req.user.role ?? '')) {
      next(new HttpForbiddenError('Недостаточно прав'));
      return;
    }
    next();
  };
}

/** owner/admin ИЛИ staff с scheduleAccessRole === 'manager'. Для управления пользователями, подразделениями, сменами. */
export function requireManagerOrAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpUnauthorizedError('Unauthorized'));
    return;
  }
  const role = req.user.role ?? '';
  const scheduleRole = req.user.scheduleAccessRole ?? 'none';
  if (['owner', 'admin'].includes(role) || (role === 'staff' && scheduleRole === 'manager')) {
    next();
    return;
  }
  next(new HttpForbiddenError('Недостаточно прав'));
}

/** Требует право редактирования графика: owner/admin ИЛИ scheduleAccessRole === 'manager'. */
export function requireScheduleEdit(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpUnauthorizedError('Unauthorized'));
    return;
  }
  const role = req.user.role ?? '';
  const scheduleRole = req.user.scheduleAccessRole ?? 'none';
  if (['owner', 'admin'].includes(role) || scheduleRole === 'manager') {
    next();
    return;
  }
  next(new HttpForbiddenError('Недостаточно прав для редактирования графика'));
}

export function verifyAuthToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    next(new HttpUnauthorizedError('Token required'));
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { userId: decoded.userId, companyId: decoded.companyId, email: decoded.email, role: decoded.role, scheduleAccessRole: decoded.scheduleAccessRole };
    next();
  } catch {
    next(new HttpUnauthorizedError('Invalid or expired token'));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    next();
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { userId: decoded.userId, companyId: decoded.companyId, email: decoded.email, role: decoded.role, scheduleAccessRole: decoded.scheduleAccessRole };
  } catch {
    // ignore
  }
  next();
}
