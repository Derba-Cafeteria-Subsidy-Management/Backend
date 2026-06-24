import type { Request, Response, NextFunction } from 'express';
import { getRequestContextFromRequest } from '../../auth/service/auth.service.js';
import { createTransaction, getTransactions, getTransactionById } from '../service/transaction.service.js';
import { TransactionListQuery } from '../types/transaction.type.js';



export const createTransactionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const context = getRequestContextFromRequest(req);
    const data = await createTransaction(req.body, {
      ...context,
      cashierId: req.user!.userId,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getTransactionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as unknown as TransactionListQuery;
    const data = await getTransactions(query, req.user!.role);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getTransactionByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id || Array.isArray(id)) {
      throw new Error('Transaction ID is required');
    }
    const data = await getTransactionById(id);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
