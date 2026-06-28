import { Request, Response, NextFunction } from 'express';
import { getAnalytics } from '../services/analytics.service';


export const analyticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getAnalytics(req.query);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};