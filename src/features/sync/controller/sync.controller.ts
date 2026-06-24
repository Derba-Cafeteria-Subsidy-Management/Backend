import type { Request, Response, NextFunction } from 'express';
import { getRequestContextFromRequest } from '../../auth/service/auth.service.js';
import { processOfflineBatch } from '../service/sync.service.js';

export const offlineBatchHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const context = getRequestContextFromRequest(req);
    const data = await processOfflineBatch(req.body, {
      ...context,
      cashierId: req.user!.userId,
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
