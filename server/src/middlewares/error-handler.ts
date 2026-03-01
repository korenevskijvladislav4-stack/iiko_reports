import { type NextFunction, type Request, type Response } from 'express';
import { type ApiError } from '@/lib/errors.js';
import logger from '@/lib/logger.js';
import environment from '@/lib/environment.js';

interface ErrorBody {
  success: false;
  message: string;
  rawErrors?: string[];
  stack?: string;
}

export default function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(err.message, err.stack);

  const status = err.statusCode ?? 500;
  const body: ErrorBody = {
    success: false,
    message: err.message,
    rawErrors: err.rawErrors,
  };
  if (environment.isDev() && err.stack) {
    body.stack = err.stack;
  }
  res.status(status).json(body);
}
