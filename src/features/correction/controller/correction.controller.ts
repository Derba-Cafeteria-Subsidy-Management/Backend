import type { Request, Response, NextFunction } from 'express';
import { getRequestContextFromRequest } from '../../auth/service/auth.service.js';
import {
  approveCorrection,
  createCorrectionRequest,
  getCorrectionRequests,
  rejectCorrection,
} from '../service/correction.service.js';
import type { CorrectionListQuery } from '../types/correction.types.js';

export const createCorrectionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const context = getRequestContextFromRequest(req);
    const data = await createCorrectionRequest(req.body, {
      ...context,
      requestedById: req.user!.userId,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getCorrectionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.query as CorrectionListQuery;
    const data = await getCorrectionRequests(query);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const approveCorrectionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const context = getRequestContextFromRequest(req);
    const id = req.params.id;
    if (!id || Array.isArray(id)) {
      throw new Error('Correction ID is required');
    }
    const data = await approveCorrection(id, {
      ...context,
      adminId: req.user!.userId,
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const rejectCorrectionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const context = getRequestContextFromRequest(req);
    const id = req.params.id;
    if (!id || Array.isArray(id)) {
      throw new Error('Correction ID is required');
    }
    const data = await rejectCorrection(id, req.body, {
      ...context,
      adminId: req.user!.userId,
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
