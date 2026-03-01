import { type Response } from 'express';

export type CustomResponse = Response;

export interface JwtPayload {
  userId: string;
  companyId: string;
  email: string;
  role?: string;
  scheduleAccessRole?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
