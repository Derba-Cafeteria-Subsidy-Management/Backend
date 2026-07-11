import { Prisma, UserStatus } from '@prisma/client';

import {
  UserListQuery,
  UserListResponse,
} from '../types/user-management.types.js';
import { prisma } from '../../../libs/lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../../../errors/errors/apperror.js';

export const getUsers = async (
  query: UserListQuery
): Promise<UserListResponse> => {
  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    where.role = query.role;
  }

  if (query.status) {
    where.status = query.status;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
        invitedById: true,
        invitedBy: {
          select: {
            id: true,
            email: true,
          },
        }
      },
    }),

    prisma.user.count({
      where,
    }),
  ]);

  return {
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin,
      invitedBy:'Super Admin',
    })),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
    },
  };
};




export const toggleUserStatus = async (
  userId: string,
  requesterId: string,
  requesterRole: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      role: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Prevent self-deactivation
  if (userId === requesterId) {
    throw new ForbiddenError('You cannot change your own status');
  }

  // Optional safety: protect SUPER_ADMIN
  if (user.role === 'SUPER_ADMIN' && requesterRole !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Cannot modify SUPER_ADMIN user');
  }

  let newStatus: UserStatus;

  switch (user.status) {
    case UserStatus.ACTIVE:
      newStatus = UserStatus.INACTIVE;
      break;

    case UserStatus.INACTIVE:
      newStatus = UserStatus.ACTIVE;
      break;

    default:
      throw new ForbiddenError(
        `Cannot toggle user with status: ${user.status}`
      );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      lastLogin: true,
      invitedById: true,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    status: updated.status,
    lastLogin: updated.lastLogin,
    invitedBy: updated.invitedById,
  };
};