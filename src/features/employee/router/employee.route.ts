import { Router } from 'express';

import { seedSuperAdmin } from '../../../scripts/seed-super-admin.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { confirmEmployeeImportController, createEmployeeController, deactivateEmployeeController, deleteEmployeeController, fingerprintScanController, getEmployeeByNUmberController, getEmployeesController, importEmployeePreviewController, searchSpecialEmployee, updateEmployeeController } from '../controller/employee.controller.js';
import { uploadExcel } from '../../shared/helpers/upload.middleware.js';

export const employeeRouter = Router();

/**
 * @openapi
 * /api/employees:
 *   get:
 *     summary: Get employees
 *     description: Returns a paginated list of employees with optional filters. Includes today's recorded meal sessions for each employee.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeNumber
 *         schema:
 *           type: string
 *         description: Filter by employee number.
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by employee full name.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by employee status.
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
 *     responses:
 *       200:
 *         description: Employees retrieved successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Access denied.
 */
employeeRouter.get(
    '/',
    authenticate,
    authorize('CASHIER', 'ADMIN', 'SUPER_ADMIN'),
    //   validate(inviteUserSchema),
    getEmployeesController
);


/**
 * @openapi
 * /api/employees:
 *   post:
 *     summary: Register a new employee
 *     description: Creates a new employee and registers their fingerprint information.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeNumber
 *               - fullName
 *               - department
 *               - fingerprintId
 *               - subsidyType
 *             properties:
 *               employeeNumber:
 *                 type: string
 *                 example: EMP001
 *               fullName:
 *                 type: string
 *                 example: Sara Haile
 *               department:
 *                 type: string
 *                 example: Engineering
 *               fingerprintId:
 *                 type: string
 *                 example: FP-001
 *               photo:
 *                 type: string
 *                 example: https://example.com/photo.jpg
 *               subsidyType:
 *                 type: string
 *                 enum: [NORMAL,SPECIAL]
 *                 example: NORMAL
 *     responses:
 *       201:
 *         description: Employee created successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin privileges required.
 *       409:
 *         description: Employee number or fingerprint already exists.
 */
employeeRouter.post(
    '/',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    //   validate(acceptInvitationSchema),
    createEmployeeController
);

/**
 * @openapi
 * api/employees/special/search:
 *   get:
 *     summary: Search a special (100% company subsidized) employee
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeNumber
 *         schema:
 *           type: string
 *         description: Employee number
 *
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Employee full name (partial match)
 *
 *     responses:
 *       200:
 *         description: Special employee found successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: Special employee retrieved successfully.
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     employeeNumber:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     status:
 *                       type: string
 *                     subsidyType:
 *                       type: string
 *                       example: FULL_COMPANY
 *                     photo:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *
 *                     mealsToday:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           session:
 *                             type: string
 *                           mealConsumed:
 *                             type: integer
 *                           drinkConsumed:
 *                             type: integer
 *                           mealAvailable:
 *                             type: boolean
 *                           drinkAvailable:
 *                             type: boolean
 *                           completed:
 *                             type: boolean
 *
 *       400:
 *         description: Employee number or name is required.
 *
 *       404:
 *         description: Special employee not found.
 *
 *       401:
 *         description: Unauthorized.
 *
 *       403:
 *         description: Forbidden.
 */

employeeRouter.get(
  "/special/search",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN", 'CASHIER'),
  searchSpecialEmployee
);

/**
 * @openapi
 * /api/employees/{employee_Number}:
 *   get:
 *     summary: Get or search employee details by employee number
 *     description: Returns complete information for a specific employee, including today's meal sessions.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employee_Number
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee_Number
 *     responses:
 *       200:
 *         description: Employee retrieved successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Access denied.
 *       404:
 *         description: Employee not found.
 */
employeeRouter.get(
    '/:employee_Number',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN', 'CASHIER'),
    //   validate(acceptInvitationSchema),
    getEmployeeByNUmberController
);

/**
 * @openapi
 * /api/employees/{id}:
 *   put:
 *     summary: Update employee
 *     description: Updates an employee's profile information such as name, department, photo, or status.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               department:
 *                 type: string
 *               photo:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Employee updated successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin privileges required.
 *       404:
 *         description: Employee not found.
 */
employeeRouter.put('/:id', authenticate, authorize('ADMIN'), updateEmployeeController);

employeeRouter.delete('/:id', authenticate, authorize('ADMIN'), deleteEmployeeController);

/**
 * @openapi
 * /api/employees/{id}/deactivate:
 *   post:
 *     summary: Deactivate employee
 *     description: Marks an employee as inactive. Inactive employees are no longer eligible for meal registration.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID.
 *     responses:
 *       200:
 *         description: Employee deactivated successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin privileges required.
 *       404:
 *         description: Employee not found.
 */
employeeRouter.post('/:id/deactivate', authenticate, authorize('ADMIN'), deactivateEmployeeController);


/**
 * @openapi
 * /api/employees/fingerprint:
 *   post:
 *     summary: Scan employee fingerprint
 *     description: Identifies an active employee using their fingerprint and returns employee information along with today's meal sessions.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fingerprintId
 *             properties:
 *               fingerprintId:
 *                 type: string
 *                 example: FP-001
 *     responses:
 *       200:
 *         description: Fingerprint recognized successfully.
 *       400:
 *         description: Invalid fingerprint request.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Cashier privileges required.
 *       404:
 *         description: Fingerprint not recognized or employee is inactive.
 */
employeeRouter.post('/fingerprint', authenticate, authorize('CASHIER'), fingerprintScanController);



/**
 * @openapi
 * /api/employees/import/preview:
 *   post:
 *     summary: Upload Excel file and preview employee import
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Preview generated successfully
 */
employeeRouter.post(
    "/import/preview",
    uploadExcel.single("file"),
    authenticate, 
    authorize('ADMIN'),
    importEmployeePreviewController
);

/**
 * @openapi
 * /api/employees/import/confirm:
 *   post:
 *     summary: Confirm employee import using preview token
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               previewToken:
 *                 type: string
 *     responses:
 *       201:
 *         description: Import completed successfully
 */
employeeRouter.post(
    "/import/confirm",
    authenticate,
    authorize('ADMIN'),
    confirmEmployeeImportController
);