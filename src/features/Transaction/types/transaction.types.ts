import type { mealType } from '@prisma/client';
import type { RequestContext } from '../../auth/types/auth.types.js';

export type MealSession = mealType;

export interface CreateTransactionInput {
  employeeId: string;
  mealSession: MealSession;
  menuItemId: string;
}

export interface TransactionListQuery {
  employeeId?: string | undefined;
  mealSession?: MealSession | undefined;
  from?: string | undefined;
  to?: string | undefined;
  cashierId?: string | undefined;
  page: number;
  limit: number;
}

export interface CreateTransactionContext extends RequestContext {
  cashierId: string;
}

export interface TransactionDetailResponse {
  id: string;
  employee: {
    id: string;
    fullName: string;
    employeeNumber: string;
    department: string;
  };
  menuItem: {
    id: string;
    name: string;
    session: MealSession;
  };
  menuPrice: number;
  employeeShare: number;
  companyShare: number;
  cashier: {
    id: string;
    username: string;
  };
  transactionDate: string;
  createdAt: Date;
  correctionStatus: 'PENDING_CORRECTION' | null;
}

export interface TransactionListItem {
  id: string;
  employeeId: string;
  fullName: string;
  mealSession: MealSession;
  menuItem: string;
  menuPrice: number;
  employeeShare: number;
  companyShare: number;
  cashierId: string;
  transactionDate: string;
  createdAt: Date;
}
