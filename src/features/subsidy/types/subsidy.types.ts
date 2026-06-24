import type { RequestContext } from '../../auth/types/auth.types.js';

export interface CreateSubsidyInput {
  employeePercent: number;
  companyPercent: number;
  effectiveFrom: string;
}

export interface SubsidyContext extends RequestContext {
  userId: string;
}

export interface ActiveSubsidyResponse {
  id: string;
  employeePercent: number;
  companyPercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}
