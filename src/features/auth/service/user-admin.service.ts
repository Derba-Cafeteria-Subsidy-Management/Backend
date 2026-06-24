import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../../../libs/lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../errors/errors/apperror.js';
import { createAuditLog } from './audit.service.js';
import type { RequestContext, SafeUser } from '../types/auth.types.js';

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

export const updateUserStatus = async (
  actorId: string,
  targetUserId: string,
  status: UserStatus,
  context: RequestContext
): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Super admin status cannot be changed through this endpoint');
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { status },
  });

  if (status !== user.status) {
    await createAuditLog({
      userId: actorId,
      action: 'USER_STATUS_CHANGED',
      entityType: 'User',
      entityId: targetUserId,
      metadata: {
        previousStatus: user.status,
        newStatus: status,
        targetEmail: user.email,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    if (status !== UserStatus.ACTIVE) {
      await prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });
    }
  }

  return toSafeUser(updated);
};

export const updateUserRole = async (
  actorId: string,
  targetUserId: string,
  role: Exclude<UserRole, 'SUPER_ADMIN'>,
  context: RequestContext
): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Super admin role cannot be changed');
  }

  if (user.role === role) {
    throw new ConflictError('User already has this role');
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { role },
  });

  await createAuditLog({
    userId: actorId,
    action: 'ROLE_CHANGED',
    entityType: 'User',
    entityId: targetUserId,
    metadata: {
      previousRole: user.role,
      newRole: role,
      targetEmail: user.email,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return toSafeUser(updated);
};
