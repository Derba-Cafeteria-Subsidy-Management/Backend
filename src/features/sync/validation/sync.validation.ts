import { z } from 'zod';

const mealSessionSchema = z.enum(['BREAKFAST', 'LUNCH', 'DINNER']);

const offlineTransactionSchema = z.object({
  localId: z.string().min(1, 'localId is required'),
  employeeId: z.string().uuid('Invalid employee ID'),
  mealSession: mealSessionSchema,
  menuItemId: z.string().uuid('Invalid menu item ID'),
  fingerprintId: z.string().min(1, 'fingerprintId is required'),
  offlineAt: z.string().datetime('offlineAt must be a valid ISO datetime'),
});

export const offlineBatchSchema = z.object({
  stationId: z.string().uuid('Invalid station ID'),
  transactions: z
    .array(offlineTransactionSchema)
    .min(1, 'At least one transaction is required'),
});
