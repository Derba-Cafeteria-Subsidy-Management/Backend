import { Router } from 'express';

import { seedSuperAdmin } from '../../../scripts/seed-super-admin.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { addPriceVersions, confirmMenuImportController, createMenus, deleteMenus, getActiveMenu, getMenu, getPriceHistorys, importMenuPreviewController, updateMenus } from '../controller/menu.controller.js';
import { uploadExcel } from '../../shared/helpers/upload.middleware.js';
import { validate } from '../../auth/middleware/validate.middleware.js';
import { CreateMenuInput, CreatePriceVersionInput, UpdateMenuInput } from '../validation/menu.validation.js';

export const menuRouter = Router();

/**
 * @openapi
 * /api/menus:
 *   get:
 *     summary: Get menu items
 *     description: Returns a paginated list of menu items. By default only active menu items are returned. Administrators can request inactive items by setting activeOnly=false.
 *     tags:
 *       - Menu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Set to false to include inactive menu items.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search by menu name or meal type [BREAKFAST, LUNCH, DINNER, DRINK].
 *     responses:
 *       200:
 *         description: Menu items retrieved successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Access denied.
 */
menuRouter.get(
    '/',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    //   validate(inviteUserSchema),
    getMenu
);


/**
 * @openapi
 * /api/menus/active:
 *   get:
 *     summary: Get active menu items
 *     description: Returns a paginated list of active menu items.
 *     tags:
 *       - Menu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search by menu name or meal type [BREAKFAST, LUNCH, DINNER, DRINK].
 *     responses:
 *       200:
 *         description: Menu items retrieved successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Access denied.
 */
menuRouter.get(
    '/active',
    authenticate,
    authorize('CASHIER'),
    //   validate(inviteUserSchema),
    getActiveMenu
);

/**
 * @openapi
 * /api/menus:
 *   post:
 *     summary: Create a menu item
 *     description: Creates a new menu item with its initial price. Prices are versioned and never overwritten.
 *     tags:
 *       - Menu
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
 *               - price
 *               - mealtype
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tibs
 *               mealtype:
 *                type: string
 *                enum: [BREAKFAST, LUNCH, DINNER, DRINK]
 *               price:
 *                 type: number
 *                 example: 120
 *     responses:
 *       201:
 *         description: Menu item created successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin access required.
 *       409:
 *         description: Menu item already exists.
 */
menuRouter.post(
    '/',
    authenticate,
    authorize('ADMIN'),
    validate(CreateMenuInput),
    createMenus
);

/**
 * @openapi
 * /api/menus/{id}:
 *   put:
 *     summary: Update a menu item
 *     description: Updates the menu item's information. Price changes must use the dedicated price version endpoint.
 *     tags:
 *       - Menu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Menu item ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               mealtype:
 *                type: string
 *                enum: [BREAKFAST, LUNCH, DINNER, DRINK]
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Menu item updated successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin access required.
 *       404:
 *         description: Menu item not found.
 */
menuRouter.put(
    '/:id',
    authenticate,
    authorize('ADMIN'),
    //   validate(acceptInvitationSchema),
    validate(UpdateMenuInput),
    updateMenus
);

menuRouter.delete(
    '/:id',
    authenticate,
    authorize('ADMIN'),
    deleteMenus
);


/**
 * @openapi
 * /api/menus/{id}/price:
 *   post:
 *     summary: Create a new price version
 *     description: Creates a new version of the menu price. Previous prices remain in history and are never overwritten.
 *     tags:
 *       - Menu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Menu item ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - price
 *               - effectiveFrom
 *             properties:
 *               price:
 *                 type: number
 *                 example: 140
 *               effectiveFrom:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-01"
 *     responses:
 *       201:
 *         description: Price version created successfully.
 *       400:
 *         description: Validation failed.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin access required.
 *       404:
 *         description: Menu item not found.
 */
menuRouter.post('/:id/price', authenticate, authorize('ADMIN'), validate(CreatePriceVersionInput), addPriceVersions);

/**
 * @openapi
 * /api/menus/{id}/price-history:
 *   get:
 *     summary: Get menu price history
 *     description: Returns all historical price versions for a menu item ordered by effective date.
 *     tags:
 *       - Menu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Menu item ID.
 *     responses:
 *       200:
 *         description: Price history retrieved successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin access required.
 *       404:
 *         description: Menu item not found.
 */
menuRouter.get('/:id/price-history', authenticate, authorize('ADMIN'), getPriceHistorys);



/**
 * @openapi
 * /api/menus/import/preview:
 *   post:
 *     summary: Upload Excel file and preview menu import
 *     tags:
 *       - Menu
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
menuRouter.post(
    "/import/preview",
    uploadExcel.single("file"),
    authenticate,
    authorize('ADMIN'),
    importMenuPreviewController
);

/**
 * @openapi
 * /api/menus/import/confirm:
 *   post:
 *     summary: Confirm menu import using preview token
 *     tags:
 *       - Menu
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
menuRouter.post(
    "/import/confirm",
    authenticate,
    authorize('ADMIN'),
    confirmMenuImportController
);

