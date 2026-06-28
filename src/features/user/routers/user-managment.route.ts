import { Router } from "express";
import { authenticate } from "../../auth/middleware/authenticate.middleware";
import { authorize } from "../../auth/middleware/authorize.middleware";
import { validateQuery } from "../../auth/middleware/validate-query.middleware";
import { getUsersHandler, toggleUserStatusHandler } from "../controllers/user-management.controller";
import { userListQuerySchema } from "../validations/user-management.validation";


export const userManagementRouter = Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - User Management
 *     summary: List all system users (Admin and Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [SUPER_ADMIN, ADMIN, CASHIER]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, INACTIVE, SUSPENDED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 users:
 *                   - id: "uuid"
 *                     email: "admin@co.com"
 *                     role: "ADMIN"
 *                     status: "ACTIVE"
 *                     lastLogin: "2026-06-20T08:00:00Z"
 *                     invitedBy: "uuid"
 *                 pagination:
 *                   page: 1
 *                   limit: 20
 *                   total: 8
 */
userManagementRouter.get(
  '/',
  authenticate,
  authorize('ADMIN','SUPER_ADMIN'),
  validateQuery(userListQuerySchema),
  getUsersHandler
);


/**
 * @openapi
 * /api/users/{id}/toggle-status:
 *   post:
 *     tags:
 *       - User Management
 *     summary: Toggle user ACTIVE/INACTIVE status (Super Admin only)
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
 *         description: User status updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "uuid"
 *                 email: "admin@co.com"
 *                 role: "ADMIN"
 *                 status: "INACTIVE"
 *                 lastLogin: "2026-06-20T08:00:00Z"
 *                 invitedBy: "uuid"
 */
userManagementRouter.post(
  '/:id/toggle-status',
  authenticate,
  authorize('SUPER_ADMIN'),
  toggleUserStatusHandler
);

