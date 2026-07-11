import { prisma } from "../../../libs/lib/prisma";
import { parseDateOnly } from "../../shared/helpers/date.helper";


export const getPayrollReport = async (
  from: string,
  to: string,
  page?: number,
  limit?: number
) => {
  const items = await prisma.transactionItem.findMany({
    where: {
      transaction: {
        transactionDate: {
          gte: parseDateOnly(from),
          lte: parseDateOnly(to),
        },
      },
    },
    include: {
      transaction: {
        select: {
          employeeId: true,
        },
      },
    },
  });

  const grouped = new Map<
    string,
    {
      mealCount: number;
      totalMealCost: number;
      employeeShare: number;
    }
  >();

  for (const item of items) {
    const employeeId = item.transaction.employeeId;
    const quantity = item.quantity ?? 1;

    const existing = grouped.get(employeeId);

    if (existing) {
      existing.mealCount += quantity;
      existing.totalMealCost += Number(item.menu_price) * quantity;
      existing.employeeShare += Number(item.employee_share) * quantity;
    } else {
      grouped.set(employeeId, {
        mealCount: quantity,
        totalMealCost: Number(item.menu_price) * quantity,
        employeeShare: Number(item.employee_share) * quantity,
      });
    }
  }

  const employeeIds = [...grouped.keys()];

  const employees = await prisma.employees.findMany({
    where: {
      id: {
        in: employeeIds,
      },
    },
  });

  const employeeMap = new Map(
    employees.map((e) => [e.id, e])
  );

  const result = [...grouped.entries()].map(([employeeId, data]) => {
    const emp = employeeMap.get(employeeId);

    return {
      employeeId: emp?.Employee_number ?? "Employee Not Found",
      employeeName: emp?.full_name ?? "Unknown",
      mealCount: data.mealCount,
      totalMealCost: data.totalMealCost,
      employeeShare: data.employeeShare,
    };
  });

  // No pagination (used for Excel export)
  if (!page || !limit) {
    return {
      data: result,
      pagination: null,
    };
  }

  const total = result.length;
  const totalPages = Math.ceil(total / limit);

  const paginated = result.slice(
    (page - 1) * limit,
    page * limit
  );

  return {
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};