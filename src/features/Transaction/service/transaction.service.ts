import { Prisma } from '@prisma/client';
import type { PrismaClient, mealType } from '@prisma/client';
import { ulid } from 'ulid';
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
  parseDateOnly,
  startOfDay,
  toDateOnlyString,
} from '../../shared/helpers/date.helper.js';
import type {
  CreateTransactionContext,
  CreateTransactionInput,
  TransactionDetailResponse,
  TransactionItemResponse,
  TransactionListItem,
  TransactionListQuery,
} from '../types/transaction.type.js';

type PricingDb = PrismaClient | Prisma.TransactionClient;

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    employee: true;
    cashier: true;
    items: {
      include: {
        menu_item: true;
        correction_requests: true;
      };
    };
  };
}>;

interface PreparedTransactionItem {
  menuItemId: string;
  quantity: number;
  menuPrice: number;
  employeeShare: number;
  companyShare: number;
}

interface CorrectionRequestDb {
  id: string;
  status: string;
}

interface MenuItemDb {
  id: string;
  name: string;
}

interface TransactionItemDb {
  id: string;
  menu_item: MenuItemDb;
  menu_price: number | string;
  employee_share: number | string;
  company_share: number | string;
  quantity?: number;
  correction_requests: CorrectionRequestDb[];
}

interface TransactionDb {
  id: string;
  employeeId: string;
  employee: { id: string; full_name: string; Employee_number: string };
  cashierId: string;
  cashier: { id: string; email: string };
  menu_session: mealType;
  items: TransactionItemDb[];
  transactionDate: Date;
  createdAt: Date;
}

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

const buildMealStatusUpdate = (meal: mealType) => {
  switch (meal) {
    case 'BREAKFAST':
      return { breakfast: true };
    case 'LUNCH':
      return { lunch: true };
    case 'DINNER':
      return { dinner: true };
    default:
      throw new ValidationError('Invalid meal session');
  }
};

const normalizeTransactionItems = (
  input: CreateTransactionInput
): Array<{ menuItemId: string; quantity: number }> => {
  if (input.items?.length) {
    return input.items.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity ?? 1,
    }));
  }

 /*  if (input.menuItemId) {
    return [
      {
        menuItemId: input.menuItemId,
        quantity: 1,
      },
    ];
  } */

  throw new ValidationError('At least one menu item is required');
};

const prepareTransactionItems = async (
  input: CreateTransactionInput,
  db: PricingDb
): Promise<PreparedTransactionItem[]> => {
  const normalizedItems = normalizeTransactionItems(input);

  return Promise.all(
    normalizedItems.map(async (item) => {
      const shares = await getPriceSharesForMenuItem(item.menuItemId, db);

      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        menuPrice: shares.menuPrice,
        employeeShare: shares.companyShare,
        companyShare: shares.employeeShare,
      };
    })
  );
};

const mapTransactionItem = (
  item: TransactionItemDb
): TransactionItemResponse => ({
  id: item.id,
  menuItem: {
    id: item.menu_item.id,
    name: item.menu_item.name,
  },
  menuPrice: Number(item.menu_price),
  employeeShare: Number(item.employee_share),
  companyShare: Number(item.company_share),
  quantity: item.quantity ?? 1,
});

const calculateTransactionTotals = (
  items: TransactionItemDb[]
) => {
  return items.reduce(
    (totals, item) => {
      const quantity = item.quantity ?? 1;

      totals.totalMenuPrice += Number(item.menu_price) * quantity;
      totals.totalEmployeeShare += Number(item.employee_share) * quantity;
      totals.totalCompanyShare += Number(item.company_share) * quantity;

      return totals;
    },
    {
      totalMenuPrice: 0,
      totalEmployeeShare: 0,
      totalCompanyShare: 0,
    }
  );
};

const hasPendingItemCorrection = (transaction: TransactionDb) =>
  transaction.items.some((item) =>
    item.correction_requests.some(
      (correction: CorrectionRequestDb) => correction.status === 'PENDING'
    )
  );

const mapTransactionResponse = (
  transaction: TransactionDb
): TransactionDetailResponse => ({
  id: transaction.id,
  employee: {
    id: transaction.employee.id,
    fullName: transaction.employee.full_name,
    employeeNumber: transaction.employee.Employee_number,
  },
  mealSession: transaction.menu_session,
  items: transaction.items.map(mapTransactionItem),
  cashier: {
    id: transaction.cashier.id,
    username: getCashierDisplayName(transaction.cashier.email),
  },
  transactionDate: toDateOnlyString(transaction.transactionDate),
  createdAt: transaction.createdAt,
  correctionStatus: hasPendingItemCorrection(transaction)
    ? 'PENDING_CORRECTION'
    : null,
});

const mapTransactionListItem = (
  transaction: TransactionDb
): TransactionListItem => {
  const totals = calculateTransactionTotals(transaction.items);

  return {
    id: transaction.id,
    employeeId: transaction.employeeId,
    employeeNumber: transaction.employee.Employee_number,
    fullName: transaction.employee.full_name,
    mealSession: transaction.menu_session,
    items: transaction.items.map(mapTransactionItem),
    totalMenuPrice: totals.totalMenuPrice,
    totalEmployeeShare: totals.totalEmployeeShare,
    totalCompanyShare: totals.totalCompanyShare,
    cashierId: transaction.cashierId,
    transactionDate: toDateOnlyString(transaction.transactionDate),
    createdAt: transaction.createdAt,
    correctionStatus: hasPendingItemCorrection(transaction)
      ? 'PENDING_CORRECTION'
      : null,
  };
};

const createTransactionWithItems = async (
  db: Prisma.TransactionClient,
  input: CreateTransactionInput,
  employeeId: string,
  cashierId: string,
  transactionDate: Date,
  createdAt?: Date
) : Promise<TransactionWithRelations> => {
  const preparedItems = await prepareTransactionItems(input, db);

  return db.transaction.create({
    data: {
      id: ulid(),
      employeeId,
      menu_session: input.mealSession,
      transactionDate,
      cashierId,
      ...(createdAt && { createdAt }),
      items: {
        create: preparedItems.map((item) => ({
          id: ulid(),
          menu_item_id: item.menuItemId,
          menu_price: item.menuPrice,
          employee_share: item.employeeShare,
          company_share: item.companyShare,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      employee: true,
      cashier: true,
      items: {
        include: {
          menu_item: true,
          correction_requests: true,
        },
      },
    },
  });
};

export const createTransaction = async (
  input: CreateTransactionInput,
  context: CreateTransactionContext
) => {
  const transactionDate = startOfDay(new Date());

  let createdTransaction: TransactionWithRelations;

  try {
    createdTransaction = await prisma.$transaction(async (tx) => {
      const employee = await tx.employees.findUnique({
        where: {
          id: input.employeeId,
        },
      });

      if (!employee) {
        throw new NotFoundError('Employee not found');
      }

      if (employee.status !== 'ACTIVE') {
        throw new ValidationError('Employee is not active');
      }

      const transaction = await createTransactionWithItems(
        tx,
        input,
        input.employeeId,
        context.cashierId,
        transactionDate
      );

      const mealUpdate = buildMealStatusUpdate(input.mealSession);

      await tx.employee_daily_meal_status.upsert({
        where: {
          employeeId_date: {
            employeeId: input.employeeId,
            date: transactionDate,
          },
        },
        update: mealUpdate,
        create: {
          employeeId: input.employeeId,
          date: transactionDate,
          ...mealUpdate,
        },
      });

      return transaction;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictError('Meal already registered for this session today');
    }

    throw error;
  }

  try {
    await createAuditLog({
      userId: context.cashierId,
      action: 'create_transaction',
      entityType: 'Transaction',
      entityId: createdTransaction.id,
      metadata: {
        employeeId: input.employeeId,
        mealSession: input.mealSession,
        items: createdTransaction.items.map(
          (item): {
            menuItemId: string;
            menuItemName: string;
            menuPrice: number | string;
            employeeShare: number | string;
            companyShare: number | string;
            quantity?: number;
          } => ({
            menuItemId: item.menu_item_id,
            menuItemName: item.menu_item.name,
            menuPrice: item.menu_price,
            employeeShare: item.employee_share,
            companyShare: item.company_share,
            quantity: item.quantity,
          })
        ),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  } catch (error) {
    // audit failures should not roll back the transaction create flow
  }

  return {
    transactionId: createdTransaction.id,
    employee: {
      id: createdTransaction.employee.id,
      fullName: createdTransaction.employee.full_name,
      employeeNumber: createdTransaction.employee.Employee_number,
    },
    mealSession: createdTransaction.menu_session,
    items: createdTransaction.items.map(mapTransactionItem),
    cashier: {
      id: createdTransaction.cashier.id,
      username: getCashierDisplayName(createdTransaction.cashier.email),
    },
    transactionDate: toDateOnlyString(createdTransaction.transactionDate),
    createdAt: createdTransaction.createdAt,
    correctionStatus: null,
  };
};

export const getTransactions = async (
  query: TransactionListQuery,
  requesterRole: string
) => {
  if (
    query.cashierId &&
    requesterRole !== 'ADMIN' &&
    requesterRole !== 'SUPER_ADMIN'
  ) {
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

  if (query.employeeNumber) {
    where.employee = {
      is: {
        Employee_number: query.employeeNumber,
      },
    };
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
        cashier: true,
        items: {
          include: {
            menu_item: true,
            correction_requests: true,
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions: transactions.map(mapTransactionListItem),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
    },
  };
};

export const getTransactionById = async (
  id: string
): Promise<TransactionDetailResponse> => {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      employee: true,
      cashier: true,
      items: {
        include: {
          menu_item: true,
          correction_requests: true,
        },
      },
    },
  });

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  return mapTransactionResponse(transaction);
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
    return {
      status: 'DUPLICATE_SKIPPED' as const,
      reason: 'Meal already registered',
      transactionId: existing.id,
    };
  }

  const preparedItems = await prepareTransactionItems(input, prisma);

  const transaction = await prisma.transaction.create({
    data: {
      id: ulid(),
      employeeId: input.employeeId,
      menu_session: input.mealSession,
      transactionDate: normalizedDate,
      cashierId,
      ...(createdAt && { createdAt }),
      items: {
        create: preparedItems.map((item) => ({
          id: ulid(),
          menu_item_id: item.menuItemId,
          menu_price: item.menuPrice,
          employee_share: item.employeeShare,
          company_share: item.companyShare,
          quantity: item.quantity,
        })),
      },
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
        items: preparedItems,
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
