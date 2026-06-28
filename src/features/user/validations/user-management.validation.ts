import { z } from 'zod';

export const userListQuerySchema = z.object({
  role: z
    .enum(['SUPER_ADMIN', 'ADMIN', 'CASHIER'])
    .optional(),

  status: z
    .enum(['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'])
    .optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(200).default(20),
});