import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { validateQuery } from '../../auth/middleware/validate-query.middleware.js';
import { getDailySummaryHandler } from '../controllers/report.controller.js';
import { dailySummarySchema } from '../validators/report.validation.js';
import { payrollHandler } from '../controllers/payroll.controller.js';
import { companyPaymentExportHandler, payrollExportHandler } from '../services/export.service.js';
import { companyPaymentHandler } from '../controllers/company-payment.controller.js';
import { analyticsSchema } from '../validators/analytics.validation.js';
import { analyticsHandler } from '../controllers/analytics.controller.js';


export const reportRouter = Router();

/**
 * @openapi
 * /api/reports/daily-summary:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Daily transaction summary (Cashier/Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-06-20"
 *     responses:
 *       200:
 *         description: Daily summary report
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 date: "2026-06-20"
 *                 totalTransactions: 214
 *                 bySession:
 *                   BREAKFAST:
 *                     count: 60
 *                     totalAmount: 4800
 *                     employeeTotal: 1920
 *                     companyTotal: 2880
 *                 grandTotal:
 *                   amount: 21920
 *                   employeeTotal: 8768
 *                   companyTotal: 13152
 */
reportRouter.get(
  '/daily-summary',
  authenticate,
  authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
  validateQuery(dailySummarySchema),
  getDailySummaryHandler
);

/**
 * @openapi
 * /api/reports/payroll:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Payroll report (HR export data)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-06-01"
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-06-30"
 *     responses:
 *       200:
 *         description: Payroll summary
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - employeeId: "uuid"
 *                   employeeName: "John Doe"
 *                   department: "Kitchen"
 *                   mealCount: 120
 *                   totalMealCost: 4800
 *                   employeeShare: 1920
 */
reportRouter.get(
  '/payroll',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  payrollHandler
);

/**
 * @openapi
 * /api/reports/payroll/export:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Export payroll as Excel file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
reportRouter.get(
  '/payroll/export',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  payrollExportHandler
);


/**
 * @openapi
 * /api/reports/company-payment:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Company payment report (Finance)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [xlsx, pdf]
 *     responses:
 *       200:
 *         description: Company payment report
 */
reportRouter.get(
  '/company-payment',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  companyPaymentHandler
);

/**
 * @openapi
 * /api/reports/analytics:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Analytics dashboard (Admin charts)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly,yearly]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 12
 *       - in: query
 *         name: year
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Chart-ready analytics data
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 labels: ["BREAKFAST", "LUNCH", "DINNER"]
 *                 transactions: [60, 120, 34]
 *                 companyRevenue: [2880, 8640, 1632]
 *                 employeeCost: [1920, 5760, 1088]
 */
reportRouter.get(
  '/analytics',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validateQuery(analyticsSchema),
  analyticsHandler
);

/**
 * @openapi
 * /api/reports/company-payment/export:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Export company payment report as Excel file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
reportRouter.get(
  '/company-payment/export',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  companyPaymentExportHandler
);


