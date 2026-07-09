import { Request, Response, NextFunction } from 'express';
import { assertNoPendingCorrections } from '../services/correction.guard';
import { getPayrollReport } from '../services/payroll.service';


export const payrollHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { from, to } = req.query as any;

    // await assertNoPendingCorrections(from, to);

    const data = await getPayrollReport(from, to);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};