import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import {
  createGroupController,
  updateGroupController,
  activateGroupController,
  deactivateGroupController,
  getGroupsController,
  getGroupByIdController,
  assignEmployeeToGroupController,
  removeEmployeeFromGroupController,
  moveEmployeeBetweenGroupsController,
  getScheduleController,
  overrideSlotController,
} from '../controller/employee-group.controller';

export const employeeGroupRouter = Router();

employeeGroupRouter.use(authenticate);
employeeGroupRouter.use(authorize('ADMIN', 'SUPER_ADMIN'));

/**
 * @openapi
 * /api/employee-groups:
 *   post:
 *     summary: Create a new employee group
 *     tags:
 *       - Employee Groups
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - rotationOrder
 *             properties:
 *               name:
 *                 type: string
 *                 example: Group A
 *               description:
 *                 type: string
 *                 example: Day shift workers
 *               rotationOrder:
 *                 type: integer
 *                 example: 1
 *               effectiveDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-07-22T09:00:00Z
 *     responses:
 *       201:
 *         description: Group created successfully.
 *       400:
 *         description: Validation or conflict error.
 */
employeeGroupRouter.post('/', createGroupController);

/**
 * @openapi
 * /api/employee-groups:
 *   get:
 *     summary: List employee groups
 *     tags:
 *       - Employee Groups
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
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
 *         description: Groups retrieved successfully.
 */
employeeGroupRouter.get('/', getGroupsController);

/**
 * @openapi
 * /api/employee-groups/schedule:
 *   get:
 *     summary: Get meal rotation schedule preview
 *     tags:
 *       - Employee Groups
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           example: 2026-07-21
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           example: 2026-07-28
 *     responses:
 *       200:
 *         description: Schedule preview retrieved successfully.
 */
employeeGroupRouter.get('/schedule', getScheduleController);

/**
 * @openapi
 * /api/employee-groups/{id}:
 *   get:
 *     summary: Get employee group details
 *     tags:
 *       - Employee Groups
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
 *         description: Group details retrieved successfully.
 *       404:
 *         description: Group not found.
 */
employeeGroupRouter.get('/:id', getGroupByIdController);

/**
 * @openapi
 * /api/employee-groups/{id}:
 *   put:
 *     summary: Update employee group
 *     tags:
 *       - Employee Groups
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               rotationOrder:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *               effectiveDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-07-22T09:00:00Z
 *     responses:
 *       200:
 *         description: Group updated successfully.
 */
employeeGroupRouter.put('/:id', updateGroupController);

/**
 * @openapi
 * /api/employee-groups/{id}/activate:
 *   post:
 *     summary: Activate employee group
 *     tags:
 *       - Employee Groups
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               effectiveDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-07-22T09:00:00Z
 *     responses:
 *       200:
 *         description: Group activated.
 */
employeeGroupRouter.post('/:id/activate', activateGroupController);

/**
 * @openapi
 * /api/employee-groups/{id}/deactivate:
 *   post:
 *     summary: Deactivate employee group
 *     tags:
 *       - Employee Groups
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               effectiveDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-07-22T09:00:00Z
 *     responses:
 *       200:
 *         description: Group deactivated.
 */
employeeGroupRouter.post('/:id/deactivate', deactivateGroupController);

/**
 * @openapi
 * /api/employee-groups/members/assign:
 *   post:
 *     summary: Assign employee to group
 *     tags:
 *       - Employee Groups
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - groupId
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               groupId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Employee assigned successfully.
 */
employeeGroupRouter.post('/members/assign', assignEmployeeToGroupController);

/**
 * @openapi
 * /api/employee-groups/members/remove:
 *   post:
 *     summary: Remove employee from group
 *     tags:
 *       - Employee Groups
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - groupId
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               groupId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Employee removed successfully.
 */
employeeGroupRouter.post('/members/remove', removeEmployeeFromGroupController);

/**
 * @openapi
 * /api/employee-groups/members/move:
 *   post:
 *     summary: Move employee between groups
 *     tags:
 *       - Employee Groups
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - fromGroupId
 *               - toGroupId
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               fromGroupId:
 *                 type: string
 *                 format: uuid
 *               toGroupId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Employee moved successfully.
 */
employeeGroupRouter.post('/members/move', moveEmployeeBetweenGroupsController);



/**
 * @openapi
 * /api/employee-groups/schedule/override:
 *   post:
 *     summary: Override shift slot with specific group
 *     tags:
 *       - Employee Groups
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - half
 *               - groupId
 *             properties:
 *               date:
 *                 type: string
 *                 example: 2026-07-21
 *               half:
 *                 type: string
 *                 enum: [FIRST_HALF, SECOND_HALF]
 *                 example: FIRST_HALF
 *               groupId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Shift slot overridden successfully.
 */
employeeGroupRouter.post('/schedule/override', overrideSlotController);
