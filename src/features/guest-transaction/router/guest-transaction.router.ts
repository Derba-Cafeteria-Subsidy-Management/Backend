import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { validate } from '../../auth/middleware/validate.middleware.js';
import { validateParams } from '../../auth/middleware/validate-params.middleware.js';
import { validateQuery } from '../../auth/middleware/validate-query.middleware.js';
import {
  createGuestTransactionHandler,
  getGuestTransactionsHandler,
  getGuestTransactionByIdHandler,
} from '../controller/guest-transaction.controller.js';
import {
  createGuestTransactionSchema,
  guestTransactionListQuerySchema,
  guestTransactionIdParamSchema,
} from '../validation/guest-transaction.validation.js';

export const guestTransactionRouter = Router();

/**
 * @openapi
 * /api/guest-transactions:
 *   post:
 *     summary: Register a guest meal transaction
 *     description: Records a guest meal transaction company-sponsored 100%. Cashier must be authenticated.
 *     tags:
 *       - Guest Transactions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invitedByEmployeeId
 *               - reason
 *               - mealSession
 *               - items
 *             properties:
 *               invitedByEmployeeId:
 *                 type: string
 *                 format: uuid
 *                 description: Employee ID who invited the guest(s)
 *               reason:
 *                 type: string
 *                 description: Reason for invitation
 *               mealSession:
 *                 type: string
 *                 enum: [BREAKFAST, LUNCH, DINNER]
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - menuItemId
 *                     - quantity
 *                   properties:
 *                     menuItemId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *           example:
 *             invitedByEmployeeId: "employee-uuid"
 *             reason: "External vendor audit visit"
 *             mealSession: "LUNCH"
 *             items:
 *               - menuItemId: "guest-menu-item-uuid"
 *                 quantity: 2
 *     responses:
 *       201:
 *         description: Guest transaction registered successfully.
 *       400:
 *         description: Invalid input or inactive employee/item.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Cashier authorization required.
 */
guestTransactionRouter.post(
  '/',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validate(createGuestTransactionSchema),
  createGuestTransactionHandler
);

/**
 * @openapi
 * /api/guest-transactions:
 *   get:
 *     summary: Get guest transaction history
 *     description: Returns paginated guest transaction history.
 *     tags:
 *       - Guest Transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: employeeNumber
 *         schema:
 *           type: string
 *       - in: query
 *         name: mealSession
 *         schema:
 *           type: string
 *           enum: [BREAKFAST, LUNCH, DINNER]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: cashierId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Guest transaction history retrieved successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Access denied.
 */
guestTransactionRouter.get(
  '/',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validateQuery(guestTransactionListQuerySchema),
  getGuestTransactionsHandler
);

/**
 * @openapi
 * /api/guest-transactions/{id}:
 *   get:
 *     summary: Get guest transaction details
 *     description: Returns complete information about a single guest meal transaction.
 *     tags:
 *       - Guest Transactions
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
 *         description: Transaction retrieved successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Access denied.
 *       404:
 *         description: Transaction not found.
 */
guestTransactionRouter.get(
  '/:id',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validateParams(guestTransactionIdParamSchema),
  getGuestTransactionByIdHandler
);
