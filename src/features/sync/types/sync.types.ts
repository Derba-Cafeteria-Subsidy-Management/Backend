import type { mealType } from '@prisma/client';
import type { RequestContext } from '../../auth/types/auth.types.js';

export type MealSession = mealType;

export interface OfflineTransactionInput {
  localId: string;
  employeeId: string;
  mealSession: MealSession;
  menuItemId: string;
  offlineAt: string;
}

export interface OfflineBatchInput {
  stationId: string;
  transactions: OfflineTransactionInput[];
}

export interface OfflineBatchContext extends RequestContext {
  cashierId: string;
}

export type OfflineSyncResultStatus =
  | 'SAVED'
  | 'DUPLICATE_SKIPPED'
  | 'EMPLOYEE_INACTIVE';

export interface OfflineSyncResult {
  localId: string;
  status: OfflineSyncResultStatus;
  transactionId?: string;
  reason?: string;
}
