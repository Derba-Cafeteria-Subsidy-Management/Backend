import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { validate } from '../../auth/middleware/validate.middleware.js';
import { validateParams } from '../../auth/middleware/validate-params.middleware.js';
import { validateQuery } from '../../auth/middleware/validate-query.middleware.js';
import { createTransactionHandler, getTransactionsHandler, getTransactionByIdHandler } from '../controller/transaction.controller.js';
import { createTransactionSchema, transactionListQuerySchema, transactionIdParamSchema } from '../validation/transaction.validation.js';



export const transactionRouter = Router();


/**
 * @openapi
 * /api/transactions:
 *   post:
 *     summary: Register a meal transaction
 *     description: Records a meal transaction for an eligible employee. A transaction can contain multiple food items. Transactions are permanent and cannot be edited directly.
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - mealSession
 *               - items
 *
 *             properties:
 *
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *                 description: Employee receiving the meal
 *
 *               mealSession:
 *                 type: string
 *                 enum:
 *                   - BREAKFAST
 *                   - LUNCH
 *                   - DINNER
 *
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 description: Food items included in this meal transaction
 *
 *                 items:
 *                   type: object
 *                   required:
 *                     - menuItemId
 *                     - quantity
 *
 *                   properties:
 *
 *                     menuItemId:
 *                       type: string
 *                       format: uuid
 *                       description: Menu item ID
 *
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       default: 1
 *
 *           example:
 *             employeeId: "employee-uuid"
 *             mealSession: "LUNCH"
 *             items:
 *               - menuItemId: "chicken-menu-uuid"
 *                 quantity: 1
 *               - menuItemId: "juice-menu-uuid"
 *                 quantity: 2
 *
 *
 *     responses:
 *
 *       201:
 *         description: Meal transaction registered successfully.
 *
 *       400:
 *         description: Invalid request.
 *
 *       401:
 *         description: Unauthorized.
 *
 *       403:
 *         description: Cashier authorization required.
 *
 *       404:
 *         description: Employee or menu item not found.
 *
 *       409:
 *         description: Employee already registered for this meal session today.
 */
transactionRouter.post(
  '/',
  authenticate,
  authorize(
    'CASHIER',
    'ADMIN',
    'SUPER_ADMIN'
  ),
  validate(createTransactionSchema),
  createTransactionHandler
);


/**
 * @openapi
 * /api/transactions:
 *   get:
 *     summary: Get transaction history
 *     description: Returns paginated meal transaction history with optional filters.
 *     tags:
 *       - Transactions
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
 *           maximum: 200
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Access denied.
 */
transactionRouter.get(
  '/',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validateQuery(transactionListQuerySchema),
  getTransactionsHandler
);

/**
 * @openapi
 * /api/transactions/{id}:
 *   get:
 *     summary: Get transaction details
 *     description: Returns complete information about a single meal transaction.
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
transactionRouter.get(
  '/:id',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validateParams(transactionIdParamSchema),
  getTransactionByIdHandler
);
