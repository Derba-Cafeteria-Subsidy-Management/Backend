import type { Request, Response, NextFunction } from 'express';
import { getRequestContextFromRequest } from '../../auth/service/auth.service.js';
import {
  createGuestTransaction,
  getGuestTransactions,
  getGuestTransactionById,
} from '../service/guest-transaction.service.js';
import { GuestTransactionListQuery } from '../types/guest-transaction.type.js';

export const createGuestTransactionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const context = getRequestContextFromRequest(req);
    const data = await createGuestTransaction(req.body, {
      ...context,
      cashierId: req.user!.userId,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getGuestTransactionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = res.locals.query as GuestTransactionListQuery;

    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    if (req.user?.role === 'CASHIER') {
      if (query.from !== today || query.to !== today) {
        return res.status(403).json({
          success: false,
          message: 'Cashiers are only authorized to view transactions for today',
        });
      }
    }

    const data = await getGuestTransactions(query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getGuestTransactionByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id || Array.isArray(id)) {
      throw new Error('Transaction ID is required');
    }
    const data = await getGuestTransactionById(id);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
