import type { Request, Response, NextFunction } from 'express';
import {
  acceptInvitation,
  forgotPassword,
  getCurrentUser,
  getRequestContextFromRequest,
  inviteUser,
  login,
  logout,
  logoutAll,
  resendInvitation,
  refreshAccessToken,
  resetPassword,
} from '../service/auth.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { clearRefreshCookie, getRefreshCookieName, setRefreshCookie } from '../utils/cookie.util.js';
import { seedSuperAdmin } from '../../../scripts/seed-super-admin.js';

const getRefreshTokenFromRequest = (req: Request): string | undefined => {
  return req.cookies?.[getRefreshCookieName()] ?? req.body?.refreshToken;
};

export const inviteUserHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await inviteUser(
      req.user!.userId,
      req.body,
      getRequestContextFromRequest(req)
    );

    sendSuccess(res, 'User invited successfully', result, 201);
  } catch (error) {
    next(error);
  }
};

export const resendInvitationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await resendInvitation(
      req.user!.userId,
      req.body,
      getRequestContextFromRequest(req)
    );

    sendSuccess(res, 'Invitation resent successfully', result);
  } catch (error) {
    next(error);
  }
};

export const acceptInvitationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await acceptInvitation(req.body, getRequestContextFromRequest(req));
    sendSuccess(res, 'Invitation accepted successfully', { user });
  } catch (error) {
    next(error);
  }
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user, tokens } = await login(req.body, getRequestContextFromRequest(req));

    setRefreshCookie(res, tokens.refreshToken);

    sendSuccess(res, 'Login successful', {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    const { accessToken } = await refreshAccessToken(refreshToken);

    sendSuccess(res, 'Token refreshed successfully', { accessToken });
  } catch (error) {
    next(error);
  }
};

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await logout(
      req.user!.userId,
      getRefreshTokenFromRequest(req),
      getRequestContextFromRequest(req)
    );

    clearRefreshCookie(res);
    sendSuccess(res, 'Logout successful', {});
  } catch (error) {
    next(error);
  }
};

export const logoutAllHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await logoutAll(req.user!.userId, getRequestContextFromRequest(req));
    clearRefreshCookie(res);
    sendSuccess(res, 'Logged out from all devices successfully', {});
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await forgotPassword(req.body, getRequestContextFromRequest(req));
    sendSuccess(res, result.message, {});
  } catch (error) {
    next(error);
  }
};

export const resetPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await resetPassword(req.body, getRequestContextFromRequest(req));
    sendSuccess(res, result.message, {});
  } catch (error) {
    next(error);
  }
};

export const meHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getCurrentUser(req.user!.userId);
    sendSuccess(res, 'User profile retrieved successfully', { user });
  } catch (error) {
    next(error);
  }
};


export const createSuperAdmin = async (
  req: Request,
  res: Response
) => {
  await seedSuperAdmin(req.body);

  return res.status(201).json({
    success: true,
    message: 'Super admin created',
  });
};