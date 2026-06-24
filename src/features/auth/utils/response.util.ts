import type { Response } from 'express';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data: T,
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  } satisfies ApiSuccessResponse<T>);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
  } satisfies ApiErrorResponse);
};
