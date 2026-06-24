import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { validate } from '../../auth/middleware/validate.middleware.js';
import { offlineBatchHandler } from '../controller/sync.controller.js';
import { offlineBatchSchema } from '../validation/sync.validation.js';

export const syncRouter = Router();

syncRouter.post(
  '/offline-batch',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validate(offlineBatchSchema),
  offlineBatchHandler
);
