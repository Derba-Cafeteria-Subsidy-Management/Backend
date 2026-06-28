import { prisma } from "../../../libs/lib/prisma";
import { parseDateOnly } from "../../shared/helpers/date.helper";


export const getCompanyPaymentReport = async (
  from: string,
  to: string
) => {
  const result = await prisma.transaction.aggregate({
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
      company_share: true,
    },
  });

  return {
    total_menu_number: result._count._all,
    total_menu_price: result._sum.menu_price ?? 0,
    total_company_share: result._sum.company_share ?? 0,
    transactionFromDate: parseDateOnly(from),
    transactionToDate: parseDateOnly(to),
  };
};