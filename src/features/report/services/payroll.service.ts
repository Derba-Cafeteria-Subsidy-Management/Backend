import { prisma } from "../../../libs/lib/prisma";
import { parseDateOnly } from "../../shared/helpers/date.helper";


export const getPayrollReport = async (
  from: string,
  to: string,
  page?: number,
  limit?: number
) => {
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);

  interface AggregatedRow {
    employeeNumber: string;
    employeeName: string;
    mealCount: number;
    totalMealCost: number;
    employeeShare: number;
  }

  const resultRows = await prisma.$queryRaw<AggregatedRow[]>`
    SELECT 
      e."Employee_number" AS "employeeNumber",
      e."full_name" AS "employeeName",
      CAST(SUM(ti.quantity) AS INTEGER) AS "mealCount",
      CAST(SUM(ti.menu_price * ti.quantity) AS DOUBLE PRECISION) AS "totalMealCost",
      CAST(SUM(ti.employee_share * ti.quantity) AS DOUBLE PRECISION) AS "employeeShare"
    FROM transaction_items ti
    JOIN transactions t ON ti."transactionId" = t.id
    JOIN employees e ON t."employeeId" = e.id
    WHERE t."transactionDate" >= ${fromDate} AND t."transactionDate" <= ${toDate}
    GROUP BY e.id, e."Employee_number", e."full_name"
    ORDER BY e."Employee_number" ASC
  `;

  const result = resultRows.map((row) => ({
    employeeId: row.employeeNumber ?? "Employee Not Found",
    employeeName: row.employeeName ?? "Unknown",
    mealCount: Number(row.mealCount),
    totalMealCost: Number(row.totalMealCost),
    employeeShare: Number(row.employeeShare),
  }));

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