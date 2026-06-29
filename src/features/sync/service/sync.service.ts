import { ulid } from 'ulid';
import { prisma } from '../../../libs/lib/prisma.js';
import { createAuditLog } from '../../auth/service/audit.service.js';
import { registerMealTransaction } from '../../Transaction/service/transaction.service.js';
import type {
  OfflineBatchContext,
  OfflineBatchInput,
  OfflineSyncResult,
} from '../types/sync.types.js';

export const processOfflineBatch = async (
  input: OfflineBatchInput,
  context: OfflineBatchContext
) => {
  const results: OfflineSyncResult[] = [];

  for (const item of input.transactions) {
    const existingSync = await prisma.offline_sync_records.findUnique({
      where: { localId: item.localId },
    });

    if (existingSync) {
      results.push({
        localId: item.localId,
        status: 'DUPLICATE_SKIPPED',
        ...(existingSync.transactionId && { transactionId: existingSync.transactionId }),
        reason: existingSync.syncReason ?? 'Already synced',
      });
      continue;
    }

    const employee = await prisma.employees.findUnique({
      where: { id: item.employeeId },
    });

    if (!employee || employee.status !== 'ACTIVE') {
      await prisma.offline_sync_records.create({
        data: {
          id: ulid(),
          localId: item.localId,
          stationId: input.stationId,
          cashierId: context.cashierId,
          syncStatus: 'EMPLOYEE_INACTIVE',
          syncReason: 'Access denied at sync time',
        },
      });

      results.push({
        localId: item.localId,
        status: 'EMPLOYEE_INACTIVE',
        reason: 'Access denied at sync time',
      });
      continue;
    }

    const offlineAt = new Date(item.offlineAt);
    const outcome = await registerMealTransaction(
      {
        employeeId: item.employeeId,
        mealSession: item.mealSession,
        menuItemId: item.menuItemId,
      },
      context.cashierId,
      offlineAt,
      offlineAt,
      context
    );

    if (outcome.status === 'DUPLICATE_SKIPPED') {
      await prisma.offline_sync_records.create({
        data: {
          id: ulid(),
          localId: item.localId,
          stationId: input.stationId,
          transactionId: outcome.transactionId,
          cashierId: context.cashierId,
          syncStatus: 'DUPLICATE_SKIPPED',
          syncReason: outcome.reason,
        },
      });

      results.push({
        localId: item.localId,
        status: 'DUPLICATE_SKIPPED',
        transactionId: outcome.transactionId,
        reason: outcome.reason,
      });
      continue;
    }

    await prisma.offline_sync_records.create({
      data: {
        id: ulid(),
        localId: item.localId,
        stationId: input.stationId,
        transactionId: outcome.transactionId,
        cashierId: context.cashierId,
        syncStatus: 'SAVED',
      },
    });

    results.push({
      localId: item.localId,
      status: 'SAVED',
      transactionId: outcome.transactionId,
    });
  }

  await createAuditLog({
    userId: context.cashierId,
    action: 'offline_sync_batch',
    entityType: 'offline_sync_records',
    entityId: input.stationId,
    metadata: {
      stationId: input.stationId,
      processed: results.length,
      saved: results.filter((result) => result.status === 'SAVED').length,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    processed: results.length,
    results,
  };
};
