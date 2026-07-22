import { mealType } from '@prisma/client';

export interface DailySummaryQuery {
  date: string;
}

export interface SessionSummary {
  count: number;
  totalAmount: number;
  employeeTotal: number;
  companyTotal: number;
  invitationExpense?: number;
}

export interface DailySummaryResponse {
  date: string;
  totalTransactions: number;
  bySession: Record<mealType, SessionSummary>;
  grandTotal: {
    amount: number;
    employeeTotal: number;
    companyTotal: number;
    companySubsidy?: number;
    invitationExpense?: number;
  };
  byEmployeeType?: {
    NORMAL: { count: number; companyShare: number };
    SHIFT: { count: number; companyShare: number };
  };
  byGroup?: Record<string, {
    groupId: string;
    groupName: string;
    count: number;
    companyShare: number;
  }>;
}