import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { validate } from '../../auth/middleware/validate.middleware.js';
import { createSubsidyHandler, getSubsidyHandler } from '../controller/subsidy.controller.js';
import { createSubsidySchema } from '../validation/subsidy.validation.js';

export const subsidyRouter = Router();

/**
 * @openapi
 * /api/subsidy:
 *   get:
 *     summary: Get active subsidy configuration
 *     description: Returns the currently active employee/company subsidy configuration.
 *     tags:
 *       - Subsidy
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active subsidy configuration retrieved successfully.
 */
subsidyRouter.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN', 'CASHIER'),
  getSubsidyHandler
);

/**
 * @openapi
 * /api/subsidy:
 *   post:
 *     summary: Create subsidy configuration
 *     description: Creates a new subsidy configuration. Employee and company percentages must total 100.
 *     tags:
 *       - Subsidy
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeePercent
 *               - companyPercent
 *               - effectiveFrom
 *               - SubsidyPolicy
 *             properties:
 *               employeePercent:
 *                 type: integer
 *               companyPercent:
 *                 type: integer
 *               effectiveFrom:
 *                 type: string
 *                 format: date
 *               SubsidyPolicy:
 *                 type: string
 *                 enum: [DEFAULT, FULL_COMPANY]  
 *     responses:
 *       201:
 *         description: Subsidy configuration created successfully.
 *       400:
 *         description: Invalid subsidy configuration.
 */
subsidyRouter.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(createSubsidySchema),
  createSubsidyHandler
);
