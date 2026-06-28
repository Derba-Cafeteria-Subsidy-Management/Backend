import { mealType } from '@prisma/client';

export interface DailySummaryQuery {
  date: string;
}

export interface SessionSummary {
  count: number;
  totalAmount: number;
  employeeTotal: number;
  companyTotal: number;
}

export interface DailySummaryResponse {
  date: string;
  totalTransactions: number;
  bySession: Record<mealType, SessionSummary>;
  grandTotal: {
    amount: number;
    employeeTotal: number;
    companyTotal: number;
  };
}