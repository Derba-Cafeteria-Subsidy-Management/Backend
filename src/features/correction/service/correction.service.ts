import { Prisma, SubsidyPolicy, SubsidyType } from '@prisma/client';
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

import {
  endOfDay,
  parseDateOnly,
} from '../../shared/helpers/date.helper.js';

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
  targetDate: Date,
  policy: SubsidyPolicy,
  db: Prisma.TransactionClient = prisma

): Promise<MenuValueSnapshot> => {


  const menu = await getMenuById(menuItemId);


  const shares =
    await getPriceSharesForMenuItem(
      menuItemId,
      db,
      policy,
      targetDate
    );


  return {

    menuItemId: menu.id,

    menuItemName: menu.name,

    menuPrice: shares.menuPrice,

    employeeShare: shares.employeeShare,

    companyShare: shares.companyShare,



  };

};




// =====================================================
// CREATE CORRECTION
// =====================================================

export const createCorrectionRequest = async (
  input: CreateCorrectionInput,
  context: CorrectionContext
) => {


  let oldValue!: MenuValueSnapshot;
  let newValue!: MenuValueSnapshot;


  let createdCorrection: any;


  try {


    createdCorrection =
      await prisma.$transaction(async (tx) => {




        const transactionItem =
          await tx.transactionItem.findUnique({

            where: {
              id: input.transactionId,
            },

            select: {

              id: true,

              menu_item_id: true,

              transaction: {
                select: {
                  id: true,
                  transactionDate: true,
                  employee: {
                    select: {
                      subsidyType: true,
                    }
                  }
                }

              }

            }
          });



        if (!transactionItem) {

          throw new NotFoundError(
            "Transaction item not found"
          );

        }



        if (
          transactionItem.menu_item_id ===
          input.newMenuItemId
        ) {

          throw new ValidationError(
            "New menu item must differ from current menu item."
          );

        }



        // Derive subsidy policy from employee's subsidy type
        const pol: SubsidyPolicy =
          transactionItem.transaction.employee.subsidyType === SubsidyType.SPECIAL
            ? SubsidyPolicy.FULL_COMPANY
            : SubsidyPolicy.DEFAULT;

        oldValue =
          await buildMenuSnapshot(
            transactionItem.menu_item_id,
            transactionItem.transaction.transactionDate,
            pol,
            tx
          );


        newValue =
          await buildMenuSnapshot(
            input.newMenuItemId,
            transactionItem.transaction.transactionDate,
            pol,
            tx
          );




        return await tx.correction_requests.create({

          data: {

            id: ulid(),

            transactionItemId:
              input.transactionId,


            requestedById:
              context.requestedById,


            reason:
              input.reason,


            old_values:
              oldValue as unknown as Prisma.InputJsonValue,


            new_values:
              newValue as unknown as Prisma.InputJsonValue,

          },


          include: {
            requestedBy: true
          }

        });



      });


  } catch (error) {


    if (
      error instanceof Prisma.PrismaClientKnownRequestError
      &&
      error.code === "P2002"
    ) {

      throw new ConflictError(
        "A pending correction already exists for this item."
      );

    }


    throw error;

  }





  await createAuditLog({

    userId: context.requestedById,

    action: "create_correction_request",

    entityType: "correction_requests",

    entityId: createdCorrection.id,

    metadata: {

      transactionItemId:
        input.transactionId,

      reason:
        input.reason,

    },

    ipAddress: context.ipAddress,

    userAgent: context.userAgent,

  });



  return {

    correctionId:
      createdCorrection.id,

    transactionItemId:
      createdCorrection.transactionItemId,

    status:
      createdCorrection.status,

    oldValue,

    newValue,

    createdAt:
      createdCorrection.createdAt,

  };


};





// =====================================================
// LIST CORRECTIONS
// =====================================================


export const getCorrectionRequests = async (
  query: CorrectionListQuery
) => {


  const where: any = {};



  if (query.status) {


    const statuses =
      Array.isArray(query.status)
        ?
        query.status
        :
        query.status
          .split(",")
          .map(s => s.trim());


    where.status = {
      in: statuses
    };


  }



  if (query.from || query.to) {

    where.createdAt = {

      ...(query.from && {
        gte: parseDateOnly(query.from)
      }),

      ...(query.to && {
        lte: endOfDay(
          parseDateOnly(query.to)
        )
      })

    };

  }



  if (query.cashierId) {

    where.requestedById =
      query.cashierId;

  }




  const [corrections, total] =
    await Promise.all([


      prisma.correction_requests.findMany({

        where,


        skip:
          (query.page - 1) * query.limit,


        take:
          query.limit,


        orderBy: {
          createdAt: "desc"
        },


        include: {


          requestedBy: true,

          approvedBy: true,

          rejectedBy: true,


          transactionItem: {

            include: {


              menu_item: true,


              transaction: {

                include: {

                  employee: true,

                  cashier: true

                }

              }


            }

          }


        }


      }),



      prisma.correction_requests.count({
        where
      })



    ]);




  return {


    corrections:


      corrections.map(item => ({

        id: item.id,


        status: item.status,


        reason: item.reason,


        oldValue: item.old_values,


        newValue: item.new_values,


        cashierName:
          getCashierDisplayName(
            item.requestedBy.email
          ),


        employee:
          item.transactionItem.transaction.employee.full_name,

        employeeNumber: item.transactionItem.transaction.employee.Employee_number,


        menuItem:
          item.transactionItem.menu_item.name,


        transactionItemId:
          item.transactionItemId,


        transactionId:
          item.transactionItem.transaction.id,

        transactiondate: item.transactionItem.transaction.transactionDate,


        createdAt: item.createdAt,


      })),



    pagination: {

      page: query.page,

      limit: query.limit,

      total,

    }


  };


};





// =====================================================
// APPROVE
// =====================================================


export const approveCorrection = async (
  id: string,
  context: ApproveCorrectionContext
) => {


  const result =
    await prisma.$transaction(async (tx) => {


      const correction =
        await tx.correction_requests.findUnique({

          where: {
            id
          },

          select: {

            id: true,

            status: true,

            transactionItemId: true,

            new_values: true,

            old_values: true,

            transactionItem: {
              select: {
                menu_item_id: true,
                quantity: true,
                transaction: {
                  select: {
                    employeeId: true,
                    menu_session: true,
                    transactionDate: true,
                  }
                }
              }
            }

          }

        });



      if (!correction) {

        throw new NotFoundError(
          "Correction request not found"
        );

      }



      if (correction.status !== "PENDING") {

        throw new ValidationError(
          "Only pending corrections can be approved"
        );

      }



      const newValues =
        correction.new_values as unknown as MenuValueSnapshot;



      const updatedItem =
        await tx.transactionItem.update({

          where: {
            id: correction.transactionItemId
          },


          data: {

            menu_item_id:
              newValues.menuItemId,


            menu_price:
              newValues.menuPrice,


            employee_share:
              newValues.employeeShare,


            company_share:
              newValues.companyShare,

          }


        });





      const updatedCorrection =
        await tx.correction_requests.update({

          where: {
            id
          },

          data: {

            status: "APPROVED",

            approvedById:
              context.adminId,

            approvedAt:
              new Date(),

          }


        });



      // ── Session-status adjustment when food type changes ──────────────
      // Retrieve the new menu item's food type from the new_values snapshot
      const oldMenuItemId = correction.transactionItem.menu_item_id;
      const itemQuantity = correction.transactionItem.quantity ?? 1;
      const txEmployeeId = correction.transactionItem.transaction.employeeId;
      const txSession = correction.transactionItem.transaction.menu_session;
      const txDate = correction.transactionItem.transaction.transactionDate;

      // Fetch old and new menu items food types
      const [oldMenuItem, newMenuItem] = await Promise.all([
        tx.menu_items.findUnique({
          where: { id: oldMenuItemId },
          select: { mealtype: true },
        }),
        tx.menu_items.findUnique({
          where: { id: newValues.menuItemId },
          select: { mealtype: true },
        }),
      ]);

      if (oldMenuItem && newMenuItem) {
        const oldIsDrink = oldMenuItem.mealtype === 'DRINK';
        const newIsDrink = newMenuItem.mealtype === 'DRINK';

        // Only adjust when the food type actually changes
        if (oldIsDrink !== newIsDrink) {
          const sessionStatus = await tx.employee_session_status.findUnique({
            where: {
              employeeId_date_session: {
                employeeId: txEmployeeId,
                date: txDate,
                session: txSession,
              }
            }
          });

          if (sessionStatus) {
            if (!oldIsDrink && newIsDrink) {
              // Meal → Drink: decrement meal, increment drink
              await tx.employee_session_status.update({
                where: {
                  employeeId_date_session: {
                    employeeId: txEmployeeId,
                    date: txDate,
                    session: txSession,
                  }
                },
                data: {
                  mealConsumed: { decrement: Math.min(itemQuantity, sessionStatus.mealConsumed) },
                  drinkConsumed: { increment: itemQuantity },
                }
              });
            } else if (oldIsDrink && !newIsDrink) {
              // Drink → Meal: decrement drink, increment meal
              await tx.employee_session_status.update({
                where: {
                  employeeId_date_session: {
                    employeeId: txEmployeeId,
                    date: txDate,
                    session: txSession,
                  }
                },
                data: {
                  drinkConsumed: { decrement: Math.min(itemQuantity, sessionStatus.drinkConsumed) },
                  mealConsumed: { increment: itemQuantity },
                }
              });
            }
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────

      return {

        correction:
          updatedCorrection,

        item:
          updatedItem

      };


    });





  await createAuditLog({

    userId: context.adminId,

    action: "approve_correction",

    entityType: "correction_requests",

    entityId: result.correction.id,

    metadata: {

      transactionItemId:
        result.item.id

    },

    ipAddress: context.ipAddress,

    userAgent: context.userAgent,

  });




  return {


    correctionId:
      result.correction.id,


    status:
      result.correction.status,


    item: result.item


  };


};





// =====================================================
// REJECT
// =====================================================


export const rejectCorrection = async (
  id: string,
  input: RejectCorrectionInput,
  context: ApproveCorrectionContext
) => {


  const correction =
    await prisma.correction_requests.findUnique({

      where: {
        id
      },


      select: {

        id: true,

        status: true,

        transactionItemId: true

      }


    });



  if (
    !correction ||
    correction.status !== "PENDING"
  ) {

    throw new NotFoundError(
      "Correction request not found"
    );

  }



  const updated =
    await prisma.correction_requests.update({

      where: {
        id
      },


      data: {

        status: "REJECTED",

        rejectedById:
          context.adminId,


        rejectedAt:
          new Date(),


        rejectionReason:
          input.reason ?? null

      }


    });




  await createAuditLog({

    userId: context.adminId,

    action: "reject_correction",

    entityType: "correction_requests",

    entityId: updated.id,


    metadata: {

      transactionItemId:
        correction.transactionItemId,

      reason:
        input.reason

    },


    ipAddress: context.ipAddress,

    userAgent: context.userAgent

  });



  return {

    correctionId:
      updated.id,


    status:
      updated.status

  };


};