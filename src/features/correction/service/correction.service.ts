import type { Prisma } from '@prisma/client';
import { prisma } from '../../../libs/lib/prisma.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../errors/errors/apperror.js';
import { createAuditLog } from '../../auth/service/audit.service.js';
import {
  getCashierDisplayName,
  getPriceSharesForMenuItem,
} from '../../shared/helpers/pricing.helper.js';
import { endOfDay, parseDateOnly } from '../../shared/helpers/date.helper.js';
import type {
  ApproveCorrectionContext,
  CorrectionContext,
  CorrectionListQuery,
  CreateCorrectionInput,
  MenuValueSnapshot,
  RejectCorrectionInput,
} from '../types/correction.types.js';
import { ulid } from 'ulid';

const buildMenuSnapshot = async (
  menuItemId: string,
  asOf: Date
): Promise<MenuValueSnapshot> => {
  const menuItem = await prisma.menu_items.findUnique({
    where: { id: menuItemId },
  });

  if (!menuItem) {
    throw new NotFoundError('Menu item not found');
  }

  const shares = await getPriceSharesForMenuItem(menuItemId, asOf);

  return {
    menuItemId: menuItem.id,
    menuItemName: menuItem.name,
    menuPrice: shares.menuPrice,
  };
};

export const createCorrectionRequest = async (
  input: CreateCorrectionInput,
  context: CorrectionContext
) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: input.transactionId },
    include: { menu_item: true },
  });

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  const pendingCorrection = await prisma.correction_requests.findFirst({
    where: {
      transactionId: input.transactionId,
      status: 'PENDING',
    },
  });

  if (pendingCorrection) {
    throw new ConflictError('A pending correction already exists for this transaction');
  }

  if (transaction.menu_item_id === input.newMenuItemId) {
    throw new ValidationError('New menu item must differ from the current menu item');
  }

  const oldValue = await buildMenuSnapshot(transaction.menu_item_id, transaction.transactionDate);
  const newValue = await buildMenuSnapshot(input.newMenuItemId, transaction.transactionDate);

  const correction = await prisma.correction_requests.create({
    data: {
      id: ulid(),
      transactionId: input.transactionId,
      requestedById: context.requestedById,
      reason: input.reason,
      old_values: oldValue as unknown as Prisma.InputJsonValue,
      new_values: newValue as unknown as Prisma.InputJsonValue,
    },
    include: {
      requestedBy: true,
    },
  });

  await createAuditLog({
    userId: context.requestedById,
    action: 'create_correction_request',
    entityType: 'correction_requests',
    entityId: correction.id,
    metadata: {
      transactionId: input.transactionId,
      oldValue,
      newValue,
      reason: input.reason,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    correctionId: correction.id,
    transactionId: correction.transactionId,
    status: correction.status,
    oldValue,
    newValue,
    requestedBy: getCashierDisplayName(correction.requestedBy.email),
    createdAt: correction.createdAt,
  };
};

export const getCorrectionRequests = async (query: CorrectionListQuery) => {
  const where: Record<string, unknown> = {
    status: query.status,
  };

  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from && { gte: parseDateOnly(query.from) }),
      ...(query.to && { lte: endOfDay(parseDateOnly(query.to)) }),
    };
  }

  const [corrections, total] = await Promise.all([
    prisma.correction_requests.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: true,
      },
    }),
    prisma.correction_requests.count({ where }),
  ]);

  return {
    corrections: corrections.map((correction) => ({
      id: correction.id,
      cashierName: getCashierDisplayName(correction.requestedBy.email),
      transactionId: correction.transactionId,
      oldValue: correction.old_values,
      newValue: correction.new_values,
      reason: correction.reason,
      status: correction.status,
      createdAt: correction.createdAt,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
    },
  };
};

export const approveCorrection = async (id: string, context: ApproveCorrectionContext) => {
  const correction = await prisma.correction_requests.findUnique({
    where: { id },
    include: { transaction: true },
  });

  if (!correction) {
    throw new NotFoundError('Correction request not found');
  }

  if (correction.status !== 'PENDING') {
    throw new ValidationError('Only pending corrections can be approved');
  }

  const newValues = correction.new_values as MenuValueSnapshot | null;
  if (!newValues) {
    throw new ValidationError('Correction is missing new values');
  }

  const shares = await getPriceSharesForMenuItem(
    newValues.menuItemId,
    correction.transaction.transactionDate
  );

  const [updatedCorrection, updatedTransaction] = await prisma.$transaction([
    prisma.correction_requests.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: context.adminId,
        approvedAt: new Date(),
      },
      include: { approvedBy: true },
    }),
    prisma.transaction.update({
      where: { id: correction.transactionId },
      data: {
        menu_item_id: newValues.menuItemId,
        menu_price: shares.menuPrice,
        employee_share: shares.employeeShare,
        company_share: shares.companyShare,
      },
    }),
  ]);

  await createAuditLog({
    userId: context.adminId,
    action: 'approve_correction',
    entityType: 'correction_requests',
    entityId: correction.id,
    metadata: {
      transactionId: correction.transactionId,
      updatedMenuItemId: newValues.menuItemId,
      updatedMenuPrice: shares.menuPrice,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    correctionId: updatedCorrection.id,
    status: updatedCorrection.status,
    approvedBy: getCashierDisplayName(updatedCorrection.approvedBy!.email),
    approvedAt: updatedCorrection.approvedAt,
    transaction: {
      id: updatedTransaction.id,
      updatedMenuItemId: updatedTransaction.menu_item_id,
      updatedMenuPrice: updatedTransaction.menu_price,
    },
  };
};

export const rejectCorrection = async (
  id: string,
  input: RejectCorrectionInput,
  context: ApproveCorrectionContext
) => {
  const correction = await prisma.correction_requests.findUnique({
    where: { id },
    include: { rejectedBy: true },
  });

  if (!correction) {
    throw new NotFoundError('Correction request not found');
  }

  if (correction.status !== 'PENDING') {
    throw new ValidationError('Only pending corrections can be rejected');
  }

  const updated = await prisma.correction_requests.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectedById: context.adminId,
      rejectedAt: new Date(),
      rejectionReason: input.reason ?? null,
    },
    include: { rejectedBy: true },
  });

  await createAuditLog({
    userId: context.adminId,
    action: 'reject_correction',
    entityType: 'correction_requests',
    entityId: correction.id,
    metadata: {
      transactionId: correction.transactionId,
      reason: input.reason,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    correctionId: updated.id,
    status: updated.status,
    rejectedBy: getCashierDisplayName(updated.rejectedBy!.email),
  };
};
