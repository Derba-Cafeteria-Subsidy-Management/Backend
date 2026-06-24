import { Router } from 'express';
import {
  acceptInvitationHandler,
  createSuperAdmin,
  forgotPasswordHandler,
  inviteUserHandler,
  loginHandler,
  logoutAllHandler,
  logoutHandler,
  meHandler,
  refreshTokenHandler,
  resetPasswordHandler,
} from '../controller/auth.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
} from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  acceptInvitationSchema,
  forgotPasswordSchema,
  inviteUserSchema,
  loginSchema,
  refreshTokenSchema,
  resetPasswordSchema,
} from '../validation/auth.validation.js';
import { seedSuperAdmin } from '../../../scripts/seed-super-admin.js';

export const authRouter = Router();

authRouter.post(
  '/invite',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(inviteUserSchema),
  inviteUserHandler
);

authRouter.post(
  '/accept-invitation',
  validate(acceptInvitationSchema),
  acceptInvitationHandler
);

authRouter.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  loginHandler
);

authRouter.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  refreshTokenHandler
);

authRouter.post('/logout', authenticate, logoutHandler);

authRouter.post('/logout-all', authenticate, logoutAllHandler);

authRouter.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validate(forgotPasswordSchema),
  forgotPasswordHandler
);

authRouter.post(
  '/reset-password',
  validate(resetPasswordSchema),
  resetPasswordHandler
);

authRouter.post(
  '/super-admin',
  validate(loginSchema),
  createSuperAdmin
);

authRouter.get('/me', authenticate, meHandler);
