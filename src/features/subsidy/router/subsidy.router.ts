import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { validate } from '../../auth/middleware/validate.middleware.js';
import { createSubsidyHandler, getSubsidyHandler } from '../controller/subsidy.controller.js';
import { createSubsidySchema } from '../validation/subsidy.validation.js';

export const subsidyRouter = Router();

subsidyRouter.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  getSubsidyHandler
);

subsidyRouter.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(createSubsidySchema),
  createSubsidyHandler
);
