import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { getAuditLogsHandler } from '../controller/audit.controller.js';

export const auditRouter = Router();

/**
 * @openapi
 * /api/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     description: Returns a paginated list of audit log entries.
 *     tags:
 *       - Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Access denied.
 */
auditRouter.get(
  '/',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  getAuditLogsHandler
);