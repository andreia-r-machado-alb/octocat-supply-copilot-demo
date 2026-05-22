export type ServiceErrorStatus = 404 | 409 | 422;

export type ServiceErrorCode =
  | 'NOT_FOUND'
  | 'STATE_CONFLICT'
  | 'INSUFFICIENT_STOCK';

export interface ServiceError {
  status: ServiceErrorStatus;
  code: ServiceErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type ServiceResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ServiceError;
    };
