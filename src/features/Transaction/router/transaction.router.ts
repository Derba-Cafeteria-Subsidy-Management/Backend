import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { validate } from '../../auth/middleware/validate.middleware.js';
import { validateParams } from '../../auth/middleware/validate-params.middleware.js';
import { validateQuery } from '../../auth/middleware/validate-query.middleware.js';
import { createTransactionHandler, getTransactionsHandler, getTransactionByIdHandler } from '../controller/transaction.controller.js';
import { createTransactionSchema, transactionListQuerySchema, transactionIdParamSchema } from '../validation/transaction.validation.js';



export const transactionRouter = Router();

transactionRouter.post(
  '/',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validate(createTransactionSchema),
  createTransactionHandler
);

transactionRouter.get(
  '/',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validateQuery(transactionListQuerySchema),
  getTransactionsHandler
);

transactionRouter.get(
  '/:id',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validateParams(transactionIdParamSchema),
  getTransactionByIdHandler
);
