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


/**
 * @openapi
 * /api/corrections:
 *   post:
 *     summary: Create correction request
 *     description: Creates a correction request for an existing transaction. Only one pending correction is allowed per transaction.
 *     tags:
 *       - Corrections
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - newMenuItemId
 *               - reason
 *             properties:
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               newMenuItemId:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *                 minLength: 10
 *     responses:
 *       201:
 *         description: Correction request submitted.
 *       400:
 *         description: Validation failed.
 *       409:
 *         description: A pending correction already exists.
 */
correctionRouter.post(
  '/',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validate(createCorrectionSchema),
  createCorrectionHandler
);

/**
 * @openapi
 * /api/corrections:
 *   get:
 *     summary: List correction requests
 *     description: |
 *       Returns paginated correction history.
 *
 *       Behavior:
 *       - ADMIN and SUPER_ADMIN can view all correction requests.
 *       - CASHIER can only view their own correction requests.
 *       - If status is not provided, all statuses are returned.
 *       - Multiple statuses can be provided using comma separation.
 *         Example: APPROVED,REJECTED
 *
 *     tags:
 *       - Corrections
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *
 *       - in: query
 *         name: status
 *         required: false
 *         description: |
 *           Filter by correction status.
 *           Supports multiple values separated by comma.
 *           Example: APPROVED,REJECTED
 *         schema:
 *           type: string
 *           example: APPROVED,REJECTED
 *           enum:
 *             - PENDING
 *             - APPROVED
 *             - REJECTED
 *
 *
 *       - in: query
 *         name: from
 *         required: false
 *         description: Filter corrections created from this date.
 *         schema:
 *           type: string
 *           format: date
 *           example: 2026-01-01
 *
 *
 *       - in: query
 *         name: to
 *         required: false
 *         description: Filter corrections created until this date.
 *         schema:
 *           type: string
 *           format: date
 *           example: 2026-01-31
 *
 *
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number.
 *         schema:
 *           type: integer
 *           default: 1
 *
 *
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of records per page.
 *         schema:
 *           type: integer
 *           default: 10
 *
 *
 *     responses:
 *
 *       200:
 *         description: Correction requests retrieved successfully.
 *
 *       401:
 *         description: Unauthorized.
 *
 *       403:
 *         description: Forbidden.
 */
correctionRouter.get(
  '/',
  authenticate,
  authorize(
    'ADMIN',
    'SUPER_ADMIN',
    'CASHIER'
  ),
  validateQuery(correctionListQuerySchema),
  getCorrectionsHandler
);

/**
 * @openapi
 * /api/corrections/{id}/approve:
 *   post:
 *     summary: Approve correction request
 *     description: Approves a pending correction request and updates the original transaction.
 *     tags:
 *       - Corrections
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string     
 *     responses:
 *       200:
 *         description: Correction approved successfully.
 *       404:
 *         description: Correction request not found.
 */
correctionRouter.post(
  '/:id/approve',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validateParams(correctionIdParamSchema),
  approveCorrectionHandler
);

/**
 * @openapi
 * /api/corrections/{id}/reject:
 *   post:
 *     summary: Reject correction request
 *     description: Rejects a pending correction request.
 *     tags:
 *       - Corrections
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Correction rejected successfully.
 */
correctionRouter.post(
  '/:id/reject',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validateParams(correctionIdParamSchema),
  validate(rejectCorrectionSchema),
  rejectCorrectionHandler
);
