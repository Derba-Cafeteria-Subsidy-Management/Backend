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
  resendInvitationHandler,
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
  resendInvitationSchema,
  refreshTokenSchema,
  resetPasswordSchema,
} from '../validation/auth.validation.js';
import { seedSuperAdmin } from '../../../scripts/seed-super-admin.js';

export const authRouter = Router();


/**
 * @openapi
 * /api/auth/invite:
 *   post:
 *     summary: Invite a new user
 *     description: Sends an invitation email to create a new system account. Only Super Administrators can invite users.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *               role:
 *                 type: string
 *                 enum: [ADMIN, CASHIER]
 *     responses:
 *       201:
 *         description: Invitation sent successfully.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Super Admin access required.
 *       409:
 *         description: User already exists or has a pending invitation.
 */
authRouter.post(
  '/invite',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(inviteUserSchema),
  inviteUserHandler
);

/**
 * @openapi
 * /api/auth/resend-invitation:
 *   post:
 *     summary: Resend invitation
 *     description: Reissues an invitation token for a pending ADMIN or CASHIER user.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: cashier@example.com
 *     responses:
 *       200:
 *         description: Invitation resent successfully.
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Super Admin access required.
 *       404:
 *         description: User not found.
 *       409:
 *         description: User is not pending.
 */
authRouter.post(
  '/resend-invitation',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(resendInvitationSchema),
  resendInvitationHandler
);


/**
 * @openapi
 *  /api/auth/accept-invitation:
 *   post:
 *     summary: Accept invitation
 *     description: Completes account registration using a valid invitation token.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Invitation accepted successfully.
 *       400:
 *         description: Invalid or expired invitation token.
 */
authRouter.post(
  '/accept-invitation',
  validate(acceptInvitationSchema),
  acceptInvitationHandler
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user and returns access and refresh tokens.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful.
 *       400:
 *         description: Invalid credentials.
 *       429:
 *         description: Too many login attempts.
 */
authRouter.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  loginHandler
);

/**
 * @openapi
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Generates a new access token using a valid refresh token.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access token refreshed successfully.
 *       401:
 *         description: Invalid or expired refresh token.
 */
authRouter.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  refreshTokenHandler
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     description: Invalidates the current refresh token and signs the user out from the current device.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful.
 *       401:
 *         description: Authentication required.
 */
authRouter.post('/logout', authenticate, logoutHandler);

/**
 * @openapi
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     description: Revokes all active refresh tokens for the authenticated user.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully.
 *       401:
 *         description: Authentication required.
 */
authRouter.post('/logout-all', authenticate, logoutAllHandler);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Sends a password reset link to the registered email address.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent if the account exists.
 *       429:
 *         description: Too many password reset requests.
 */
authRouter.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validate(forgotPasswordSchema),
  forgotPasswordHandler
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Resets a user's password using a valid password reset token.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *       400:
 *         description: Invalid or expired reset token.
 */
authRouter.post(
  '/reset-password',
  validate(resetPasswordSchema),
  resetPasswordHandler
);

/**
 * @openapi
 * /api/auth/super-admin:
 *   post:
 *     summary: Create initial Super Admin
 *     description: Creates the first Super Administrator account. Intended for initial system setup only.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: Super Admin created successfully.
 *       409:
 *         description: Super Admin already exists.
 */
authRouter.post(
  '/super-admin',
  validate(loginSchema),
  createSuperAdmin
);


/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     description: Returns the authenticated user's profile and account information.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully.
 *       401:
 *         description: Authentication required.
 */
authRouter.get('/me', authenticate, meHandler);
