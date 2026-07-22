import { Prisma, SubsidyPolicy } from '@prisma/client';
import { ulid } from 'ulid';
import { prisma } from '../../../libs/lib/prisma.js';
import {
  NotFoundError,
  ValidationError,
} from '../../../errors/errors/apperror.js';
import { createAuditLog } from '../../auth/service/audit.service.js';
import {
  getCashierDisplayName,
  getPriceSharesForMenuItem,
} from '../../shared/helpers/pricing.helper.js';
import {
  parseDateOnly,
  startOfDay,
  toDateOnlyString,
} from '../../shared/helpers/date.helper.js';
import {
  CreateGuestTransactionInput,
  CreateGuestTransactionContext,
  GuestTransactionListQuery,
} from '../types/guest-transaction.type.js';

export const createGuestTransaction = async (
  input: CreateGuestTransactionInput,
  context: CreateGuestTransactionContext
) => {
  // Service Layer Business Validations
  if (!input.invitedByEmployeeId) {
    throw new ValidationError('Inviter employee ID is required');
  }

  if (!input.reason || input.reason.trim() === '') {
    throw new ValidationError('Reason is required');
  }

  if (!input.items || input.items.length === 0) {
    throw new ValidationError('At least one menu item is required');
  }

  const transactionDate = startOfDay(new Date());

  const createdTransaction = await prisma.$transaction(async (tx) => {
    // 1. Validate inviter employee exists
    const employee = await tx.employees.findUnique({
      where: { id: input.invitedByEmployeeId },
    });

    if (!employee) {
      throw new NotFoundError('Inviter employee not found');
    }

    // 2. Validate employee is ACTIVE
    if (employee.status !== 'ACTIVE') {
      throw new ValidationError('Inviter employee is not active');
    }

    // 3. Validate every menu item exists, status == ACTIVE, audience == GUEST, and quantity > 0
    const preparedItems = await Promise.all(
      input.items.map(async (item) => {
        if (!item.menuItemId) {
          throw new ValidationError('Menu item ID is required');
        }

        if (item.quantity == null || item.quantity <= 0) {
          throw new ValidationError('Quantity must be greater than zero');
        }

        const menuItem = await tx.menu_items.findUnique({
          where: { id: item.menuItemId },
        });

        if (!menuItem) {
          throw new NotFoundError(`Menu item ${item.menuItemId} not found`);
        }

        if (menuItem.status !== 'ACTIVE') {
          throw new ValidationError(`Menu item ${menuItem.name} is inactive`);
        }

        if (menuItem.audience !== 'GUEST') {
          throw new ValidationError(`Menu item ${menuItem.name} is not for guests`);
        }

        // Calculate subsidy using FULL_COMPANY policy
        const shares = await getPriceSharesForMenuItem(
          item.menuItemId,
          tx,
          SubsidyPolicy.FULL_COMPANY
        );

        return {
          menuItemId: item.menuItemId,
          menuItemName: menuItem.name,
          quantity: item.quantity,
          price: shares.menuPrice,
          companyShare: shares.companyShare,
          employeeShare: shares.employeeShare,
        };
      })
    );

    // 4. Create GuestMealTransaction
    const transactionId = ulid();
    const guestTx = await tx.guestMealTransaction.create({
      data: {
        id: transactionId,
        invitedByEmployeeId: input.invitedByEmployeeId,
        reason: input.reason,
        menu_session: input.mealSession,
        transactionDate,
        cashierId: context.cashierId,
        items: {
          create: preparedItems.map((item) => ({
            id: ulid(),
            menu_item_id: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            company_share: item.companyShare,
          })),
        },
      },
      include: {
        invitedBy: true,
        cashier: true,
        items: {
          include: {
            menu_item: true,
          },
        },
      },
    });

    return guestTx;
  });

  // 5. Generate audit log
  try {
    await createAuditLog({
      userId: context.cashierId,
      action: 'create_transaction',
      entityType: 'GuestMealTransaction',
      entityId: createdTransaction.id,
      metadata: {
        invitedByEmployeeId: input.invitedByEmployeeId,
        reason: input.reason,
        mealSession: input.mealSession,
        items: createdTransaction.items.map((item) => ({
          menuItemId: item.menu_item_id,
          menuItemName: item.menu_item.name,
          menuPrice: item.price,
          companyShare: item.company_share,
          employeeShare: 0,
          quantity: item.quantity,
        })),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  } catch (error) {
    // audit log failures should not roll back the transaction
  }

  // 6. Return response
  return {
    transactionId: createdTransaction.id,
    invitedEmployee: {
      id: createdTransaction.invitedBy.id,
      employeeNumber: createdTransaction.invitedBy.Employee_number,
      fullName: createdTransaction.invitedBy.full_name,
    },
    cashier: {
      id: createdTransaction.cashier.id,
      username: getCashierDisplayName(createdTransaction.cashier.email),
    },
    reason: createdTransaction.reason,
    session: createdTransaction.menu_session,
    totalQuantity: createdTransaction.items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: createdTransaction.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    transactionDate: toDateOnlyString(createdTransaction.transactionDate),
    createdAt: createdTransaction.createdAt,
  };
};

export const getGuestTransactions = async (
  query: GuestTransactionListQuery
) => {
  const where: Record<string, any> = {};

  if (query.employeeId) {
    where.invitedByEmployeeId = query.employeeId;
  }

  if (query.employeeNumber) {
    where.invitedBy = {
      Employee_number: query.employeeNumber,
    };
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
    prisma.guestMealTransaction.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: true,
        cashier: true,
        items: {
          include: {
            menu_item: true,
          },
        },
      },
    }),
    prisma.guestMealTransaction.count({ where }),
  ]);

  const mapped = transactions.map((gt) => {
    const totalQuantity = gt.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = gt.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return {
      transactionId: gt.id,
      invitedEmployee: {
        id: gt.invitedBy.id,
        employeeNumber: gt.invitedBy.Employee_number,
        fullName: gt.invitedBy.full_name,
      },
      cashier: {
        id: gt.cashier.id,
        username: getCashierDisplayName(gt.cashier.email),
      },
      reason: gt.reason,
      session: gt.menu_session,
      totalQuantity,
      totalAmount,
      transactionDate: toDateOnlyString(gt.transactionDate),
      createdAt: gt.createdAt,
    };
  });

  return {
    transactions: mapped,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
    },
  };
};

export const getGuestTransactionById = async (id: string) => {
  const gt = await prisma.guestMealTransaction.findUnique({
    where: { id },
    include: {
      invitedBy: true,
      cashier: true,
      items: {
        include: {
          menu_item: true,
        },
      },
    },
  });

  if (!gt) {
    throw new NotFoundError('Guest transaction not found');
  }

  const items = gt.items.map((item) => {
    const subtotal = item.price * item.quantity;
    return {
      menuItem: {
        id: item.menu_item.id,
        name: item.menu_item.name,
      },
      quantity: item.quantity,
      unitPrice: item.price,
      companyShare: item.company_share,
      employeeShare: 0,
      subtotal,
    };
  });

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalCompanyExpense = items.reduce((sum, i) => sum + i.companyShare * i.quantity, 0);

  return {
    id: gt.id,
    invitedEmployee: {
      id: gt.invitedBy.id,
      employeeNumber: gt.invitedBy.Employee_number,
      fullName: gt.invitedBy.full_name,
    },
    cashier: {
      id: gt.cashier.id,
      username: getCashierDisplayName(gt.cashier.email),
    },
    reason: gt.reason,
    session: gt.menu_session,
    transactionDate: toDateOnlyString(gt.transactionDate),
    items,
    totals: {
      totalQuantity,
      totalCompanyExpense,
    },
    createdAt: gt.createdAt,
  };
};
