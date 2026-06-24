import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { validate } from '../../auth/middleware/validate.middleware.js';
import { validateParams } from '../../auth/middleware/validate-params.middleware.js';
import { validateQuery } from '../../auth/middleware/validate-query.middleware.js';
import {
  approveCorrectionHandler,
  createCorrectionHandler,
  getCorrectionsHandler,
  rejectCorrectionHandler,
} from '../controller/correction.controller.js';
import {
  correctionIdParamSchema,
  correctionListQuerySchema,
  createCorrectionSchema,
  rejectCorrectionSchema,
} from '../validation/correction.validation.js';

export const correctionRouter = Router();

correctionRouter.post(
  '/',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validate(createCorrectionSchema),
  createCorrectionHandler
);

correctionRouter.get(
  '/',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validateQuery(correctionListQuerySchema),
  getCorrectionsHandler
);

correctionRouter.post(
  '/:id/approve',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validateParams(correctionIdParamSchema),
  approveCorrectionHandler
);

correctionRouter.post(
  '/:id/rejection',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validateParams(correctionIdParamSchema),
  validate(rejectCorrectionSchema),
  rejectCorrectionHandler
);
