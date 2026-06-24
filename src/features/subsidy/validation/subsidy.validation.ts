import { z } from 'zod';

export const createSubsidySchema = z
  .object({
    employeePercent: z.number().min(0).max(100),
    companyPercent: z.number().min(0).max(100),
    effectiveFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveFrom must be an ISO date (YYYY-MM-DD)'),
  })
  .refine((data) => data.employeePercent + data.companyPercent === 100, {
    message: 'employeePercent and companyPercent must sum to 100',
  });
