import { prisma } from "../../../libs/lib/prisma";
import { parseDateOnly } from "../../shared/helpers/date.helper";


export const getPayrollReport = async (from: string, to: string) => {
  const data = await prisma.transaction.groupBy({
    by: ['employeeId'],
    where: {
      transactionDate: {
        gte: parseDateOnly(from),
        lte: parseDateOnly(to),
      },
    },
    _count: {
      _all: true,
    },
    _sum: {
      menu_price: true,
      employee_share: true,
    },
  });

  const employeeIds = data.map((d) => d.employeeId);

  const employees = await prisma.employees.findMany({
    where: {
      id: { in: employeeIds },
    },
  });

  const map = new Map(employees.map((e) => [e.id, e]));

  return data.map((row) => {
    const emp = map.get(row.employeeId);

    return {
      employeeId: emp?.Employee_number ?? 'Employee Not Found',
      employeeName: emp?.full_name ?? 'Unknown',
      department: emp?.department ?? 'N/A',
      mealCount: row._count._all,
      totalMealCost: row._sum.menu_price ?? 0,
      employeeShare: row._sum.employee_share ?? 0,
    };
  });
};