import { z } from 'zod';

const mealSessionSchema = z.enum(['BREAKFAST', 'LUNCH', 'DINNER']);
const guestTransactionItemSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
});

export const createGuestTransactionSchema = z.object({
  invitedByEmployeeId: z.string().uuid('Invalid employee ID'),
  reason: z.string().min(1, 'Reason is required'),
  mealSession: mealSessionSchema,
  items: z.array(guestTransactionItemSchema).min(1, 'At least one menu item is required'),
});

export const guestTransactionListQuerySchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID').optional(),
  employeeNumber: z.string().optional(),
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

export const guestTransactionIdParamSchema = z.object({
  id: z.string()
});
