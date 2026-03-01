export interface IApiError extends Error {
  statusCode: number;
  rawErrors?: string[];
}

export class ApiError extends Error implements IApiError {
  statusCode: number;
  rawErrors: string[];

  constructor(statusCode: number, message: string, rawErrors?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.rawErrors = rawErrors ?? [];
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class HttpBadRequestError extends ApiError {
  constructor(message: string, errors?: string[]) {
    super(400, message, errors);
  }
}

export class HttpUnauthorizedError extends ApiError {
  constructor(message: string) {
    super(401, message);
  }
}

export class HttpForbiddenError extends ApiError {
  constructor(message: string) {
    super(403, message);
  }
}

export class HttpNotFoundError extends ApiError {
  constructor(message: string, errors?: string[]) {
    super(404, message, errors);
  }
}

export class HttpInternalServerError extends ApiError {
  constructor(message: string, errors?: string[]) {
    super(500, message, errors);
  }
}
