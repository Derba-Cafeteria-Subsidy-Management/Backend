import { Router } from "express";
import { authenticate } from "../../auth/middleware/authenticate.middleware.js";
import { authorize } from "../../auth/middleware/authorize.middleware.js";
import {
  getAuthenticationSettingsHandler,
  updateAuthenticationSettingsHandler,
} from "../controllers/system-settings.controller.js";

import { validate } from "../../auth/middleware/validate.middleware.js";
import { updateAuthenticationSettingsSchema } from "../validation/system-settings.validation.js";

export const systemrouter = Router();

/**
* @openapi
*   /api/system-settings/authentication:
*     get:
*       tags:
*         - System Settings
*       summary: Get authentication settings
*       security:
*         - bearerAuth: []
*       responses:
*         200:
*           description: Success
*           content:
*             application/json:
*               schema:
*                 type: object
*                 properties:
*                   success:
*                     type: boolean
*                   data:
*                     type: object
*                     properties:
*                       fingerprintEnabled:
*                         type: boolean
*                       employeeSearchEnabled:
*                         type: boolean
*/

systemrouter.get(
  "/authentication",
  authenticate,
  authorize("ADMIN","SUPER_ADMIN"),
  getAuthenticationSettingsHandler
);

/**
 * @openapi
 * /api/system-settings/authentication:
 *   patch:
 *     summary: Update authentication settings
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - System Settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fingerprintEnabled
 *               - employeeSearchEnabled
 *             properties:
 *               fingerprintEnabled:
 *                 type: boolean
 *               employeeSearchEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated successfully
 */


systemrouter.patch(
  "/authentication",
  authenticate,
  authorize("ADMIN","SUPER_ADMIN"),
  validate(updateAuthenticationSettingsSchema),
  updateAuthenticationSettingsHandler
);

