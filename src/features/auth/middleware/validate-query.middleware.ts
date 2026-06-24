import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../../../errors/errors/apperror.js';

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(', ');
      next(new ValidationError(message));
      return;
    }

    req.query = result.data as Request['query'];
    next();
  };
