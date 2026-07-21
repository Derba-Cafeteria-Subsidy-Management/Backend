import type { Request, Response, NextFunction } from 'express';
import { getRequestContextFromRequest } from '../../auth/service/auth.service.js';
import { createSubsidyConfig, getCurrentSubsidy } from '../service/subsidy.service.js';
import { SubsidyPolicy } from '@prisma/client';



export const getSubsidyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { policy } = req.query;

    if (
      typeof policy !== 'string' ||
      !Object.values(SubsidyPolicy).includes(policy as SubsidyPolicy)
    ) {
      res.status(400).json({
        success: false,
        message: `Invalid policy. Allowed values: ${Object.values(SubsidyPolicy).join(', ')}`
      });
      return;
    }

    const data = await getCurrentSubsidy(policy as SubsidyPolicy);

    res.status(200).json({
      success: true,
      data,
    });
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
