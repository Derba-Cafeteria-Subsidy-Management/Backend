import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error') {
    super(message, 500, false);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

const isPrismaError = (err: unknown): boolean => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'clientVersion' in err
  );
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let customError: AppError;

  if (err instanceof AppError) {
    customError = err;
  } else if (isPrismaError(err)) {
    customError = new DatabaseError('Database operation failed');
  } else {
    customError = new AppError('Internal server error', 500, false);
  }

  const { statusCode, message, isOperational } = customError;

  if (!isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' &&
      !isOperational && { stack: err.stack }),
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};
