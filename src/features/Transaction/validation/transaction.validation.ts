import { z } from 'zod';

const mealSessionSchema = z.enum(['BREAKFAST', 'LUNCH', 'DINNER']);

export const createTransactionSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  mealSession: mealSessionSchema,
  menuItemId: z.string().uuid('Invalid menu item ID'),
});

export const transactionListQuerySchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID').optional(),
  mealSession: mealSessionSchema.optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be an ISO date (YYYY-MM-DD)')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be an ISO date (YYYY-MM-DD)')
    .optional(),
  cashierId: z.string().uuid('Invalid cashier ID').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const transactionIdParamSchema = z.object({
  id: z.string().uuid('Invalid transaction ID'),
});
