import type { CorrectionRequestStatus } from '@prisma/client';
import type { RequestContext } from '../../auth/types/auth.types.js';

export interface CreateCorrectionInput {
  transactionId: string;
  newMenuItemId: string;
  reason: string;
}

export interface CorrectionListQuery {
  status?: CorrectionRequestStatus | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page: number;
  limit: number;
}

export interface CorrectionContext extends RequestContext {
  requestedById: string;
}

export interface ApproveCorrectionContext extends RequestContext {
  adminId: string;
}

export interface RejectCorrectionInput {
  reason?: string | undefined;
}

export interface MenuValueSnapshot {
  menuItemId: string;
  menuItemName: string;
  menuPrice: number;
  employeeShare: number;
  companyShare: number; 
}
