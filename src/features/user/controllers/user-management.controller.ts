import type {
    NextFunction,
    Request,
    Response,
} from 'express';


import type { UserListQuery } from '../types/user-management.types.js';
import { getUsers, toggleUserStatus } from '../services/user-management.service.js';

export const getUsersHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const query = res.locals.query as UserListQuery;

        const data = await getUsers(query);

        // if user role is admin and query role is not cashier, throw forbidden error
        if (
            req.user!.role === 'ADMIN' &&
            query.role &&
            query.role !== 'CASHIER'
        ) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view users with this role',
            });
        }

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
};



export const toggleUserStatusHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.params.id;

        if (!userId || Array.isArray(userId)) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required',
            });
        }
        const data = await toggleUserStatus(
            userId,
            req.user!.userId,
            req.user!.role
        );

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
};