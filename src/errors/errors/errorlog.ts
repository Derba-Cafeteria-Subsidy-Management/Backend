// import { Request, Response, NextFunction } from 'express';
// import { logger } from '../lib/logger';

// export function errorHandler(
//   err: Error,
//   req: Request,
//   res: Response,
//   _next: NextFunction
// ) {
//   logger.error({
//     requestId: req.requestId,
//     message: err.message,
//     stack: err.stack,
//   });

//   res.status(500).json({
//     message: 'Internal server error',
//     requestId: req.requestId,
//   });
// }
