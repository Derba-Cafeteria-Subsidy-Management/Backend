import { Router } from 'express';

import { seedSuperAdmin } from '../../../scripts/seed-super-admin.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';
import { authorize } from '../../auth/middleware/authorize.middleware.js';
import { addPriceVersions, createMenus, getMenu, getPriceHistorys, updateMenus } from '../controller/menu.controller.js';

export const authRouter = Router();

authRouter.get(
    '/',
    authenticate,
    //   validate(inviteUserSchema),
    getMenu
);

authRouter.post(
    '/',
    authenticate,
    authorize('ADMIN'),
    //   validate(acceptInvitationSchema),
    createMenus
);

authRouter.put(
    '/:id',
    authenticate,
    authorize('ADMIN'),
    //   validate(acceptInvitationSchema),
    updateMenus
);

authRouter.post('/:id/price', authenticate, authorize('ADMIN'), addPriceVersions);

authRouter.get('/:id/price-history', authenticate, authorize('ADMIN'), getPriceHistorys);


