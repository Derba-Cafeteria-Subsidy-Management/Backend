import { z } from 'zod';

export const createCorrectionSchema = z.object({
  transactionId: z.string().uuid('Invalid transaction ID'),
  newMenuItemId: z.string().uuid('Invalid menu item ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export const correctionListQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be an ISO date (YYYY-MM-DD)')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be an ISO date (YYYY-MM-DD)')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export const correctionIdParamSchema = z.object({
  id: z.string().uuid('Invalid correction ID'),
});

export const rejectCorrectionSchema = z.object({
  reason: z.string().optional(),
});
