import type { CorrectionRequestStatus } from '@prisma/client';
import type { RequestContext } from '../../auth/types/auth.types.js';




export interface CreateCorrectionInput {

  transactionId: string;

  newMenuItemId: string;

  reason: string;

}



export interface CorrectionListQuery {

  /**
   * Supports:
   * ?status=APPROVED
   *
   * or
   *
   * ?status=APPROVED,REJECTED
   */
  status?: CorrectionRequestStatus[] | string;


  cashierId?: string;


  from?: string;


  to?: string;


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

  reason?: string;

}



export interface MenuValueSnapshot {

  menuItemId: string;

  menuItemName: string;

  menuPrice: number;

  employeeShare: number;

  companyShare: number;



}