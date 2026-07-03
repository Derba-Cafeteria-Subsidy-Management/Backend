import { Prisma } from '@prisma/client';
import { prisma } from '../../../libs/lib/prisma.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../errors/errors/apperror.js';
import { createAuditLog } from '../../auth/service/audit.service.js';
import {
  getCashierDisplayName,
  getPriceSharesForMenuItem,
} from '../../shared/helpers/pricing.helper.js';
import { endOfDay, parseDateOnly } from '../../shared/helpers/date.helper.js';
import type {
  ApproveCorrectionContext,
  CorrectionContext,
  CorrectionListQuery,
  CreateCorrectionInput,
  MenuValueSnapshot,
  RejectCorrectionInput,
} from '../types/correction.types.js';
import { ulid } from 'ulid';
import { getMenuById } from '../../menu/service/menu.service.js';

const buildMenuSnapshot = async (
  menuItemId: string,
  db: Prisma.TransactionClient = prisma


): Promise<MenuValueSnapshot> => {


  const menu =
    await getMenuById(menuItemId);

  const shares =
    await getPriceSharesForMenuItem(
      menuItemId,
      db
    );

  return {
    menuItemId: menu.id,
    menuItemName: menu.name,
    menuPrice: shares.menuPrice,
    employeeShare: shares.employeeShare,
    companyShare: shares.companyShare
  };

};



export const createCorrectionRequest = async (
  input: CreateCorrectionInput,
  context: CorrectionContext
) => {

  let oldValue!: MenuValueSnapshot;
  let newValue!: MenuValueSnapshot;

  let createdCorrection: Awaited<
    ReturnType<typeof prisma.correction_requests.create>
  >;

  try {

    createdCorrection = await prisma.$transaction(async (tx) => {

      //---------------------------------------------------------
      // Get Transaction
      //---------------------------------------------------------

      const transaction = await tx.transaction.findUnique({
        where: {
          id: input.transactionId,
        },
        select: {
          id: true,
          transactionDate: true,
          menu_item_id: true,
        },
      });

      if (!transaction) {
        throw new NotFoundError(
          "Transaction not found"
        );
      }

      //---------------------------------------------------------
      // Validate menu
      //---------------------------------------------------------

      if (transaction.menu_item_id === input.newMenuItemId) {
        throw new ValidationError(
          "New menu item must differ from current menu item."
        );
      }

      //---------------------------------------------------------
      // Build snapshots
      //---------------------------------------------------------

      oldValue = await buildMenuSnapshot(
        transaction.menu_item_id,
        tx
      );

      newValue = await buildMenuSnapshot(
        input.newMenuItemId,
        tx
      );

      //---------------------------------------------------------
      // Create correction
      //---------------------------------------------------------

      return await tx.correction_requests.create({

        data: {

          id: ulid(),

          transactionId: input.transactionId,

          requestedById: context.requestedById,

          reason: input.reason,

          old_values:
            oldValue as unknown as Prisma.InputJsonValue,

          new_values:
            newValue as unknown as Prisma.InputJsonValue,

        },

        include: {

          requestedBy: true,

        },

      });

    });

  } catch (error) {

    //---------------------------------------------------------
    // Duplicate pending correction
    //---------------------------------------------------------

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {

      throw new ConflictError(
        "A pending correction request already exists for this transaction."
      );

    }

    throw error;
  }

  //---------------------------------------------------------
  // Audit (Outside Transaction)
  //---------------------------------------------------------

  try {

    await createAuditLog({

      userId: context.requestedById,

      action: "create_correction_request",

      entityType: "correction_requests",

      entityId: createdCorrection.id,

      metadata: {

        transactionId: input.transactionId,



        reason: input.reason,

      },

      ipAddress: context.ipAddress,

      userAgent: context.userAgent,

    });

  } catch (error) {

    // logger.error(
    //   "Failed to create audit log",
    //   error
    // );

  }

  //---------------------------------------------------------
  // Response
  //---------------------------------------------------------

  return {

    correctionId: createdCorrection.id,

    transactionId: createdCorrection.transactionId,

    status: createdCorrection.status,

    oldValue,

    newValue,

    createdAt: createdCorrection.createdAt,
   

  };

};
export const getCorrectionRequests = async (query: CorrectionListQuery) => {
  const where: Record<string, unknown> = {
    status: query.status,
  };

  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from && { gte: parseDateOnly(query.from) }),
      ...(query.to && { lte: endOfDay(parseDateOnly(query.to)) }),
    };
  }

  const [corrections, total] = await Promise.all([
    prisma.correction_requests.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: true,
      },
    }),
    prisma.correction_requests.count({ where }),
  ]);

  return {
    corrections: corrections.map((correction) => ({
      id: correction.id,
      cashierName: getCashierDisplayName(correction.requestedBy.email),
      transactionId: correction.transactionId,
      oldValue: correction.old_values,
      newValue: correction.new_values,
      reason: correction.reason,
      status: correction.status,
      createdAt: correction.createdAt,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
    },
  };
};



export const approveCorrection = async (
  id: string,
  context: ApproveCorrectionContext
) => {

  const result = await prisma.$transaction(async (tx) => {

    //-------------------------------------------------------
    // 1. Fetch correction (minimal data)
    //-------------------------------------------------------

    const correction = await tx.correction_requests.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        transactionId: true,
        new_values: true,
      },
    });

    if (!correction) {
      throw new NotFoundError("Correction request not found");
    }

    if (correction.status !== "PENDING") {
      throw new ValidationError("Only pending corrections can be approved");
    }

    const newValues =
      correction.new_values as MenuValueSnapshot | null;

    if (!newValues) {
      throw new ValidationError("Invalid correction snapshot");
    }

    //-------------------------------------------------------
    // 2. Apply correction to transaction
    //-------------------------------------------------------

    const updatedTransaction = await tx.transaction.update({
      where: {
        id: correction.transactionId,
      },
      data: {
        menu_item_id: newValues.menuItemId,
        menu_price: newValues.menuPrice,
        employee_share: newValues.employeeShare,
        company_share: newValues.companyShare,
      },
      select: {
        id: true,
        menu_item_id: true,
        menu_price: true,
        employee_share: true,
        company_share: true,
      },
    });

    //-------------------------------------------------------
    // 3. Approve correction (single source of truth update)
    //-------------------------------------------------------

    const updatedCorrection = await tx.correction_requests.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: context.adminId,
        approvedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        approvedAt: true,
        approvedBy: {
          select: {
            email: true,
          },
        },
      },
    });

    return {
      correction: updatedCorrection,
      transaction: updatedTransaction,
    };
  });

  //-------------------------------------------------------
  // 4. Audit (outside transaction)
  //-------------------------------------------------------

  try {
    await createAuditLog({
      userId: context.adminId,
      action: "approve_correction",
      entityType: "correction_requests",
      entityId: result.correction.id,
      metadata: {
        transactionId: result.transaction.id,
        updatedMenuItemId: result.transaction.menu_item_id,
        updatedMenuPrice: result.transaction.menu_price,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  } catch (err) {
    // logger.error("Audit log failed", err);
  }

  //-------------------------------------------------------
  // 5. Response
  //-------------------------------------------------------

  return {
    correctionId: result.correction.id,
    status: result.correction.status,
    approvedAt: result.correction.approvedAt,

    transaction: {
      id: result.transaction.id,
      menuItemId: result.transaction.menu_item_id,
      menuPrice: result.transaction.menu_price,
      employeeShare: result.transaction.employee_share,
      companyShare: result.transaction.company_share,
    },
  };
};

export const rejectCorrection = async (
  id: string,
  input: RejectCorrectionInput,
  context: ApproveCorrectionContext
) => {
  const correction = await prisma.correction_requests.findUnique({
    where: {
      id,
      status: 'PENDING'
    },
    select: {
      id: true,
      status: true,
      transactionId: true,
      rejectedBy : {
        select: {
          email: true
        }
      },
    },
  });

  if (!correction) {
    throw new NotFoundError('Correction request not found');
  }



  const updated = await prisma.correction_requests.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectedById: context.adminId,
      rejectedAt: new Date(),
      rejectionReason: input.reason ?? null,
    },
    select: {
      id: true,
      status: true,
      transactionId: true,
      rejectedBy: {
        select: {
          email: true
        }
      },
    },
  });

  await createAuditLog({
    userId: context.adminId,
    action: 'reject_correction',
    entityType: 'correction_requests',
    entityId: correction.id,
    metadata: {
      transactionId: correction.transactionId,
      reason: input.reason,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    correctionId: updated.id,
    status: updated.status,
    rejectedBy: getCashierDisplayName(updated.rejectedBy!.email)
  };
};
