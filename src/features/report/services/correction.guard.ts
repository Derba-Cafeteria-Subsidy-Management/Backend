
import { ForbiddenError } from '../../../errors/errors/apperror.js';
import { prisma } from '../../../libs/lib/prisma.js';
import { parseDateOnly } from '../../shared/helpers/date.helper.js';


export const assertNoPendingCorrections = async (
  from: string,
  to: string
) => {
  const pending = await prisma.correction_requests.count({
  where: {
    status: "PENDING",
    transactionItem: {
      transaction: {
        transactionDate: {
          gte: parseDateOnly(from),
          lte: parseDateOnly(to),
        },
      },
    },
  },
});
  if (pending > 0) {
    throw new ForbiddenError(
      'Report blocked. Pending corrections exist for the selected period.'
    );
  }
};