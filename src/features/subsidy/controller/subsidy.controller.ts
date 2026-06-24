import type { Request, Response, NextFunction } from 'express';
import { getRequestContextFromRequest } from '../../auth/service/auth.service.js';
import { createSubsidyConfig, getCurrentSubsidy } from '../service/subsidy.service.js';

export const getSubsidyHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await getCurrentSubsidy();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createSubsidyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const context = getRequestContextFromRequest(req);
    const data = await createSubsidyConfig(req.body, {
      ...context,
      userId: req.user!.userId,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
