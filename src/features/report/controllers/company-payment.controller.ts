import { Request, Response, NextFunction } from 'express';
import { assertNoPendingCorrections } from '../services/correction.guard';
import { getCompanyPaymentReport } from '../services/company-payment.service';


export const companyPaymentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { from, to } = req.query as any;

    // await assertNoPendingCorrections(from, to);

    const data = await getCompanyPaymentReport(from, to);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};