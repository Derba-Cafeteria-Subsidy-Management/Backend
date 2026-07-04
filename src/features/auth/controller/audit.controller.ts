import type { Request, Response, NextFunction } from 'express';
import type { AuditAction } from '@prisma/client';
import { getAuditLogs } from '../service/audit.service.js';

export const getAuditLogsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const data = await getAuditLogs({
      ...(page && { page }),
      ...(limit && { limit }),
      ...(req.query.action && { action: req.query.action as AuditAction }),
      ...(req.query.entityType && { entityType: String(req.query.entityType) }),
      ...(req.query.entityId && { entityId: String(req.query.entityId) }),
      ...(req.query.userId && { userId: String(req.query.userId) }),
    });
    

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};