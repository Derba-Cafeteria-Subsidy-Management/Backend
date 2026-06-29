import type { mealType } from '@prisma/client';
import { prisma } from '../../../libs/lib/prisma.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../errors/errors/apperror.js';
import { createAuditLog } from '../../auth/service/audit.service.js';
import type { RequestContext } from '../../auth/types/auth.types.js';
import {
  getCashierDisplayName,
  getPriceSharesForMenuItem,
} from '../../shared/helpers/pricing.helper.js';
import {
  endOfDay,
  parseDateOnly,
  startOfDay,
  toDateOnlyString,
} from '../../shared/helpers/date.helper.js';
import { TransactionDetailResponse, CreateTransactionInput, CreateTransactionContext, TransactionListQuery, TransactionListItem } from '../types/transaction.type.js';
import { ulid } from 'ulid';



const ensureActiveEmployee = async (employeeId: string) => {
  const employee = await prisma.employees.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  if (employee.status !== 'ACTIVE') {
    throw new ValidationError('Employee is not active');
  }

  return employee;
};

const mapTransactionDetail = async (
  transaction: {
    id: string;
    menu_session: mealType;
    menu_price: number;
    employee_share: number;
    company_share: number;
    transactionDate: Date;
    createdAt: Date;
    employee: {
      id: string;
      full_name: string;
      Employee_number: string;
      department: string;
    };
    menu_item: { id: string; name: string };
    cashier: { id: string; email: string };
    correction_requests: { status: string }[];
  }
): Promise<TransactionDetailResponse> => {
  const hasPendingCorrection = transaction.correction_requests.some(
    (correction) => correction.status === 'PENDING'
  );

  return {
    id: transaction.id,
    employee: {
      id: transaction.employee.id,
      fullName: transaction.employee.full_name,
      employeeNumber: transaction.employee.Employee_number,
      department: transaction.employee.department,
    },
    menuItem: {
      id: transaction.menu_item.id,
      name: transaction.menu_item.name,
      session: transaction.menu_session,
    },
    menuPrice: transaction.menu_price,
    employeeShare: transaction.employee_share,
    companyShare: transaction.company_share,
    cashier: {
      id: transaction.cashier.id,
      username: getCashierDisplayName(transaction.cashier.email),
    },
    transactionDate: toDateOnlyString(transaction.transactionDate),
    createdAt: transaction.createdAt,
    correctionStatus: hasPendingCorrection ? 'PENDING_CORRECTION' : null,
  };
};

export const createTransaction = async (
  input: CreateTransactionInput,
  context: CreateTransactionContext
) => {
  const employee = await ensureActiveEmployee(input.employeeId);
  const transactionDate = startOfDay(new Date());

  const existing = await prisma.transaction.findUnique({
    where: {
      unique_meal_per_day: {
        employeeId: input.employeeId,
        menu_session: input.mealSession,
        transactionDate,
      },
    },
  });

  if (existing) {
    throw new ConflictError('Meal already registered for this session today');
  }

  const shares = await getPriceSharesForMenuItem(input.menuItemId, transactionDate);

  const transaction = await prisma.transaction.create({
    data: {
      id: ulid(),
      employeeId: input.employeeId,
      menu_item_id: input.menuItemId,
      menu_session: input.mealSession,
      menu_price: shares.menuPrice,
      employee_share: shares.employeeShare,
      company_share: shares.companyShare,
      transactionDate,
      cashierId: context.cashierId,
    },
    include: {
      employee: true,
      menu_item: true,
      cashier: true,
      correction_requests: { where: { status: 'PENDING' } },
    },
  });

  await createAuditLog({
    userId: context.cashierId,
    action: 'create_transaction',
    entityType: 'Transaction',
    entityId: transaction.id,
    metadata: {
      employeeId: input.employeeId,
      mealSession: input.mealSession,
      menuItemId: input.menuItemId,
      menuPrice: shares.menuPrice,
      employeeShare: shares.employeeShare,
      companyShare: shares.companyShare,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    transactionId: transaction.id,
    employee: {
      id: employee.id,
      fullName: employee.full_name,
    },
    menuItem: {
      id: transaction.menu_item.id,
      name: transaction.menu_item.name,
    },
    mealSession: transaction.menu_session,
    menuPrice: transaction.menu_price,
    employeeShare: transaction.employee_share,
    companyShare: transaction.company_share,
    cashierId: transaction.cashierId,
    transactionDate: toDateOnlyString(transaction.transactionDate),
    createdAt: transaction.createdAt,
  };
};

export const getTransactions = async (
  query: TransactionListQuery,
  requesterRole: string
) => {
  if (query.cashierId && requesterRole !== 'ADMIN' && requesterRole !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Only admins can filter by cashier');
  }

  const where: Record<string, unknown> = {};

  if (query.employeeId) {
    where.employeeId = query.employeeId;
  }

  if (query.mealSession) {
    where.menu_session = query.mealSession;
  }

  if (query.cashierId) {
    where.cashierId = query.cashierId;
  }

  if (query.from || query.to) {
    where.transactionDate = {
      ...(query.from && { gte: parseDateOnly(query.from) }),
      ...(query.to && { lte: parseDateOnly(query.to) }),
    };
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: true,
        menu_item: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  const items: TransactionListItem[] = transactions.map((transaction) => ({
    id: transaction.id,
    employeeId: transaction.employeeId,
    fullName: transaction.employee.full_name,
    mealSession: transaction.menu_session,
    menuItem: transaction.menu_item.name,
    menuPrice: transaction.menu_price,
    employeeShare: transaction.employee_share,
    companyShare: transaction.company_share,
    cashierId: transaction.cashierId,
    transactionDate: toDateOnlyString(transaction.transactionDate),
    createdAt: transaction.createdAt,
  }));

  return {
    transactions: items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
    },
  };
};

export const getTransactionById = async (id: string): Promise<TransactionDetailResponse> => {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      employee: true,
      menu_item: true,
      cashier: true,
      correction_requests: { where: { status: 'PENDING' } },
    },
  });

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  return mapTransactionDetail(transaction);
};

export const registerMealTransaction = async (
  input: CreateTransactionInput,
  cashierId: string,
  transactionDate: Date,
  createdAt?: Date,
  auditContext?: RequestContext
) => {
  const employee = await ensureActiveEmployee(input.employeeId);
  const normalizedDate = startOfDay(transactionDate);

  const existing = await prisma.transaction.findUnique({
    where: {
      unique_meal_per_day: {
        employeeId: input.employeeId,
        menu_session: input.mealSession,
        transactionDate: normalizedDate,
      },
    },
  });

  if (existing) {
    return { status: 'DUPLICATE_SKIPPED' as const, reason: 'Meal already registered', transactionId: existing.id };
  }

  const shares = await getPriceSharesForMenuItem(input.menuItemId, normalizedDate);

  const transaction = await prisma.transaction.create({
    data: {
      id: ulid(),
      employeeId: input.employeeId,
      menu_item_id: input.menuItemId,
      menu_session: input.mealSession,
      menu_price: shares.menuPrice,
      employee_share: shares.employeeShare,
      company_share: shares.companyShare,
      transactionDate: normalizedDate,
      cashierId,
      ...(createdAt && { createdAt }),
    },
  });

  if (auditContext) {
    await createAuditLog({
      userId: cashierId,
      action: 'create_transaction',
      entityType: 'Transaction',
      entityId: transaction.id,
      metadata: {
        employeeId: input.employeeId,
        mealSession: input.mealSession,
        menuItemId: input.menuItemId,
        source: 'offline_sync',
      },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });
  }

  return {
    status: 'SAVED' as const,
    transactionId: transaction.id,
    employee,
  };
};
