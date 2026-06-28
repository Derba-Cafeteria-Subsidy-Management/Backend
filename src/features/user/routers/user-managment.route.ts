import { Router } from "express";
import { authenticate } from "../../auth/middleware/authenticate.middleware";
import { authorize } from "../../auth/middleware/authorize.middleware";
import { validateQuery } from "../../auth/middleware/validate-query.middleware";
import { getUsersHandler, toggleUserStatusHandler } from "../controllers/user-management.controller";
import { userListQuerySchema } from "../validations/user-management.validation";


export const userManagementRouter = Router();


userManagementRouter.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  validateQuery(userListQuerySchema),
  getUsersHandler
);

userManagementRouter.post(
  '/:id/toggle-status',
  authenticate,
  authorize('SUPER_ADMIN'),
  toggleUserStatusHandler
);

