import { prisma } from "../../../libs/lib/prisma";
import { parseDateOnly } from "../../shared/helpers/date.helper";


export const getCompanyPaymentReport = async (
  from: string,
  to: string
) => {
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);

  // Fetch all employee transaction items in the range
  const employeeItems = await prisma.transactionItem.findMany({
    where: {
      transaction: {
        transactionDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
    },
    select: {
      menu_price: true,
      company_share: true,
      employee_share: true,
      quantity: true,
      transaction: {
        select: {
          employee: {
            select: {
              employeeType: true,
              groupMembers: {
                where: { active: true },
                select: {
                  group: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Fetch all guest transaction items in the range
  const guestItems = await prisma.guestMealItem.findMany({
    where: {
      guestTransaction: {
        transactionDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
    },
    select: {
      price: true,
      company_share: true,
      quantity: true,
    },
  });

  let totalMenuNumber = 0;
  let totalMenuPrice = 0;
  let companySubsidy = 0;
  let employeePayment = 0;
  let shiftEmployeeExpense = 0;

  const byGroup: Record<string, { groupId: string; groupName: string; count: number; companyShare: number }> = {};

  for (const item of employeeItems) {
    const qty = item.quantity ?? 1;
    totalMenuNumber += qty;
    totalMenuPrice += item.menu_price * qty;

    const empType = item.transaction.employee.employeeType;
    const itemCompShare = item.company_share * qty;

    if (empType === 'SHIFT') {
      shiftEmployeeExpense += itemCompShare;
      const activeMember = item.transaction.employee.groupMembers?.[0];
      if (activeMember) {
        const grpId = activeMember.group.id;
        const grpName = activeMember.group.name;
        if (!byGroup[grpId]) {
          byGroup[grpId] = {
            groupId: grpId,
            groupName: grpName,
            count: 0,
            companyShare: 0,
          };
        }
        byGroup[grpId].count += qty;
        byGroup[grpId].companyShare += itemCompShare;
      }
    } else {
      companySubsidy += itemCompShare;
      employeePayment += item.employee_share * qty;
    }
  }

  let invitationExpense = 0;

  for (const item of guestItems) {
    const qty = item.quantity ?? 1;
    totalMenuNumber += qty;
    totalMenuPrice += item.price * qty;
    invitationExpense += item.company_share * qty;
  }

  const totalCompanyExpense = companySubsidy + shiftEmployeeExpense + invitationExpense;

  return {
    total_menu_number: totalMenuNumber,
    total_menu_price: totalMenuPrice,
    company_subsidy: companySubsidy,
    employee_payment: employeePayment,
    shift_employee_expense: shiftEmployeeExpense,
    invitation_expense: invitationExpense,
    total_company_share: totalCompanyExpense,
    byGroup: Object.values(byGroup),
    transactionFromDate: fromDate,
    transactionToDate: toDate,
  };
};