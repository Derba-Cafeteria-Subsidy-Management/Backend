import { z } from 'zod';

export const analyticsSchema = z.object({
  mode: z.enum(['daily', 'weekly', 'monthly']),
  date: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  year: z.coerce.number().optional(),
});