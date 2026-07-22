import { mealType } from '@prisma/client';
import { RequestContext } from '../../auth/types/auth.types.js';

export interface CreateGuestTransactionInput {
  invitedByEmployeeId: string;
  reason: string;
  mealSession: mealType;
  items: {
    menuItemId: string;
    quantity: number;
  }[];
}

export interface CreateGuestTransactionContext extends RequestContext {
  cashierId: string;
}

export interface GuestTransactionListQuery {
  employeeId?: string;
  employeeNumber?: string;
  mealSession?: mealType;
  cashierId?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface GuestTransactionListItem {
  transactionId: string;
  invitedEmployee: {
    id: string;
    employeeNumber: string;
    fullName: string;
  };
  cashier: {
    id: string;
    username: string;
  };
  reason: string;
  session: mealType;
  totalQuantity: number;
  totalAmount: number;
  transactionDate: string;
  createdAt: Date;
}

export interface GuestTransactionDetailResponse {
  id: string;
  invitedEmployee: {
    id: string;
    employeeNumber: string;
    fullName: string;
  };
  cashier: {
    id: string;
    username: string;
  };
  reason: string;
  session: mealType;
  transactionDate: string;
  items: {
    menuItem: {
      id: string;
      name: string;
    };
    quantity: number;
    unitPrice: number;
    companyShare: number;
    employeeShare: number;
    subtotal: number;
  }[];
  totals: {
    totalQuantity: number;
    totalCompanyExpense: number;
  };
  createdAt: Date;
}
