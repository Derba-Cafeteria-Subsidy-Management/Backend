import type { mealType } from '@prisma/client';
import type { RequestContext } from '../../auth/types/auth.types.js';

export type MealSession = mealType;

export interface TransactionItemInput {
  menuItemId: string;
  quantity?: number | undefined;
}

export interface CreateTransactionInput {
  employeeId: string;
  mealSession: MealSession;
  items?: TransactionItemInput[] | undefined;
}

export interface TransactionListQuery {
  employeeId?: string | undefined;
  employeeNumber?: string | undefined;
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

export interface TransactionItemResponse {
  id: string;
  menuItem: {
    id: string;
    name: string;
  };
  menuPrice: number;
  employeeShare: number;
  companyShare: number;
  quantity: number;
}

export interface TransactionDetailResponse {
  id: string;
  employee: {
    id: string;
    fullName: string;
    employeeNumber: string;
  };
  mealSession: MealSession;
  items: TransactionItemResponse[];
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
  employeeNumber: string;
  fullName: string;
  mealSession: MealSession;
  items: TransactionItemResponse[];
  totalMenuPrice: number;
  totalEmployeeShare: number;
  totalCompanyShare: number;
  cashierId: string;
  transactionDate: string;
  createdAt: Date;
  correctionStatus: 'PENDING_CORRECTION' | null;
}
