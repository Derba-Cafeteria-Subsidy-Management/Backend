import { Request, Response, NextFunction } from 'express';
import { getDailySummary } from '../services/daily-report.service';
import { assertNoPendingCorrections } from '../services/correction.guard';


export const getDailySummaryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date } = req.query as { date: string };

    // await assertNoPendingCorrections(date as string, date as string);

    const data = await getDailySummary(date);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};