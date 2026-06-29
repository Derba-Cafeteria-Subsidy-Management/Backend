import { prisma } from '../../../libs/lib/prisma.js';
import type { Prisma } from '@prisma/client';
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
