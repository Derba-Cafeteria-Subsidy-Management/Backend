import type {
  NextFunction,
  Request,
  Response,
} from 'express';


import type { UserListQuery } from '../types/user-management.types.js';
import { getUsers, toggleUserStatus } from '../services/user-management.service.js';

export const getUsersHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.query as UserListQuery;

    const data = await getUsers(query);

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
)=> {
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