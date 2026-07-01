import type { Request } from 'express';
import { UserStatus } from '@prisma/client';
import { prisma } from '../../../libs/lib/prisma.js';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../../errors/errors/apperror.js';
import { createAuditLog } from './audit.service.js';
import { sendInvitationEmail, sendPasswordResetEmail } from './email.service.js';
import { createAuthTokens, verifyRefreshToken } from './jwt.service.js';
import { comparePassword, hashPassword } from './password.service.js';
import type {
  AcceptInvitationInput,
  AuthTokens,
  ForgotPasswordInput,
  InviteUserInput,
  LoginInput,
  RequestContext,
  ResetPasswordInput,
  SafeUser,
} from '../types/auth.types.js';
import { generateSecureToken, hashToken } from '../utils/token.util.js';
import {
  getInvitationExpiryDate,
  getPasswordResetExpiryDate,
  getRefreshTokenExpiryDate,
  isExpired,
} from '../utils/expiry.util.js';
import { config } from '../../../config.js';

const INVALID_CREDENTIALS = 'Invalid credentials';
const GENERIC_RESET_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.';

const toSafeUser = (user: {
  id: string;
  email: string;
  role: SafeUser['role'];
  status: SafeUser['status'];
  lastLogin: Date | null;
  createdAt: Date;
}): SafeUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  status: user.status,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
});

const getRequestContext = (req: Request): RequestContext => {
  const context: RequestContext = {};
  const ipAddress = req.ip ?? req.socket.remoteAddress;
  const userAgent = req.get('user-agent');

  if (ipAddress) {
    context.ipAddress = ipAddress;
  }

  if (userAgent) {
    context.userAgent = userAgent;
  }

  return context;
};

const assertUserCanLogin = (status: UserStatus): void => {
  if (status !== UserStatus.ACTIVE) {
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }
};

const persistRefreshToken = async (
  userId: string,
  refreshToken: string
): Promise<void> => {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshTokenExpiryDate(),
    },
  });
};

const deleteExpiredRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({
    where: {
      userId,
      expiresAt: { lte: new Date() },
    },
  });
};

export const inviteUser = async (
  inviterId: string,
  input: InviteUserInput,
  context: RequestContext
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new ConflictError('A user with this email already exists');
  }

  const pendingInvitation = await prisma.invitation.findFirst({
    where: {
      email: input.email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (pendingInvitation) {
    throw new ConflictError('A pending invitation already exists for this email');
  }

  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = getInvitationExpiryDate();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        role: input.role,
        status: UserStatus.PENDING,
        invitedById: inviterId,
      },
    });

    const invitation = await tx.invitation.create({
      data: {
        email: input.email,
        role: input.role,
        tokenHash,
        expiresAt,
        invitedById: inviterId,
      },
    });

    return { user, invitation };
  });

  if (process.env.NODE_ENV === "development") {
  console.log("Invitation Token:", rawToken);

  return;
}

  await sendInvitationEmail(input.email, rawToken, input.role);

  await createAuditLog({
    userId: inviterId,
    action: 'USER_INVITED',
    entityType: 'User',
    entityId: result.user.id,
    metadata: {
      email: input.email,
      role: input.role,
      invitationId: result.invitation.id,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    token: rawToken,
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    status: result.user.status,
    expiresAt,
  };
};

export const acceptInvitation = async (
  input: AcceptInvitationInput,
  context: RequestContext
): Promise<SafeUser> => {
  const tokenHash = hashToken(input.token);

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation || invitation.acceptedAt) {
    throw new AppError('Invalid or expired invitation', 400);
  }

  if (isExpired(invitation.expiresAt)) {
    throw new AppError('Invalid or expired invitation', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: invitation.email },
  });

  if (!user || user.status !== UserStatus.PENDING) {
    throw new AppError('Invalid or expired invitation', 400);
  }

  const passwordHash = await hashPassword(input.password);

  const updatedUser = await prisma.$transaction(async (tx) => {
    const activated = await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return activated;
  });

  await createAuditLog({
    userId: updatedUser.id,
    action: 'INVITATION_ACCEPTED',
    entityType: 'Invitation',
    entityId: invitation.id,
    metadata: { email: updatedUser.email },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return toSafeUser(updatedUser);
};

export const login = async (
  input: LoginInput,
  context: RequestContext
): Promise<{ user: SafeUser; tokens: AuthTokens }> => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user?.passwordHash) {
    await createAuditLog({
      action: 'LOGIN_FAILURE',
      entityType: 'User',
      metadata: { email: input.email, reason: 'user_not_found_or_no_password' },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }

  try {
    assertUserCanLogin(user.status);
  } catch (error) {
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_FAILURE',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: input.email, reason: 'inactive_status', status: user.status },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    throw error;
  }

  const passwordMatches = await comparePassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_FAILURE',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: input.email, reason: 'invalid_password' },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }

  const tokens = createAuthTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  await deleteExpiredRefreshTokens(user.id);
  await persistRefreshToken(user.id, tokens.refreshToken);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  await createAuditLog({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    entityType: 'User',
    entityId: user.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  // refresh token 





  return {
    user: toSafeUser(updatedUser),
    tokens,
    
  };
};

export const refreshAccessToken = async (
  refreshToken: string
): Promise<{ accessToken: string }> => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });

  if (!storedToken || isExpired(storedToken.expiresAt)) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  assertUserCanLogin(storedToken.user.status);

  const accessToken = createAuthTokens({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  }).accessToken;

  return { accessToken };
};

export const logout = async (
  userId: string,
  refreshToken: string | undefined,
  context: RequestContext
): Promise<void> => {
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        tokenHash: hashToken(refreshToken),
      },
    });
  }

  await createAuditLog({
    userId,
    action: 'LOGOUT',
    entityType: 'User',
    entityId: userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
};

export const logoutAll = async (
  userId: string,
  context: RequestContext
): Promise<void> => {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });

  await createAuditLog({
    userId,
    action: 'LOGOUT_ALL',
    entityType: 'User',
    entityId: userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
};

export const forgotPassword = async (
  input: ForgotPasswordInput,
  context: RequestContext
): Promise<{ message: string }> => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (user && user.status === UserStatus.ACTIVE) {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = getPasswordResetExpiryDate();

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    await sendPasswordResetEmail(user.email, rawToken);

    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  return { message: GENERIC_RESET_MESSAGE };
};

export const resetPassword = async (
  input: ResetPasswordInput,
  context: RequestContext
): Promise<{ message: string }> => {
  const tokenHash = hashToken(input.token);

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || isExpired(resetToken.expiresAt)) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  if (resetToken.user.status !== UserStatus.ACTIVE) {
    throw new ForbiddenError('Account is not active');
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    await tx.refreshToken.deleteMany({
      where: { userId: resetToken.userId },
    });
  });

  await createAuditLog({
    userId: resetToken.userId,
    action: 'PASSWORD_RESET_COMPLETED',
    entityType: 'User',
    entityId: resetToken.userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return { message: 'Password reset successfully' };
};

export const getCurrentUser = async (userId: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return toSafeUser(user);
};

export const getRequestContextFromRequest = getRequestContext;
