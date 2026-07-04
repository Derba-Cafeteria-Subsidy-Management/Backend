import { prisma } from '../../../libs/lib/prisma.js';
import type { AuditAction, Prisma } from '@prisma/client';
import type { AuditLogInput } from '../types/auth.types.js';
import { ulid } from 'ulid';

export const createAuditLog = async (input: AuditLogInput): Promise<void> => {
  const data: Prisma.AuditLogCreateInput = {
    id: ulid(),
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  };

  if (input.userId) {
    data.user = { connect: { id: input.userId } };
  }

  if (input.metadata) {
    data.metadata = input.metadata as Prisma.InputJsonValue;
  }

  await prisma.auditLog.create({ data });
};

export const getAuditLogs = async (input: {
  page?: number;
  limit?: number;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  userId?: string;
}) => {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;

  const where: Prisma.AuditLogWhereInput = {
    ...(input.action && { action: input.action }),
    ...(input.entityType && { entityType: input.entityType }),
    ...(input.entityId && { entityId: input.entityId }),
    ...(input.userId && { userId: input.userId }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      user: log.user,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
