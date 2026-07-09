import { z } from 'zod';

const mealSessionSchema = z.enum(['BREAKFAST', 'LUNCH', 'DINNER']);
const transactionItemSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
});

export const createTransactionSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  mealSession: mealSessionSchema,
  items: z.array(transactionItemSchema).min(1, 'At least one menu item is required').optional(),
});

export const transactionItemIdSchema = z.object({
  id: z.string().uuid('Invalid transaction item ID'),
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
