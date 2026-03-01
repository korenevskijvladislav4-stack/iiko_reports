import { type Response } from 'express';

/**
 * Базовый класс для контроллеров — общие методы отправки ответов.
 */
abstract class Api {
  public send<T>(
    res: Response,
    data: T,
    statusCode: number = 200,
    message: string = 'success'
  ): Response {
    return res.status(statusCode).json({ message, data });
  }
}

export default Api;
