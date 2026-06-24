import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../service/jwt.service.js';
import { UnauthorizedError } from '../../../errors/errors/apperror.js';

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch {
    next(new UnauthorizedError('Authentication required'));
  }
};
