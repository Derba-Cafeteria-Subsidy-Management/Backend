import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { validate } from '../../auth/middleware/validate.middleware.js';
import { offlineBatchHandler } from '../controller/sync.controller.js';
import { offlineBatchSchema } from '../validation/sync.validation.js';

export const syncRouter = Router();



/**
 * @openapi
 * /api/sync/offline-batch:
 *   post:
 *     summary: Synchronize offline meal transactions
 *     description: Uploads locally queued transactions after reconnecting. Each transaction is validated and processed idempotently.
 *     tags:
 *       - Offline Sync
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stationId
 *               - transactions
 *             properties:
 *               stationId:
 *                 type: string
 *                 format: uuid
 *               transactions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Offline transactions processed successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Cashier authorization required.
 */
syncRouter.post(
  '/offline-batch',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validate(offlineBatchSchema),
  offlineBatchHandler
);
