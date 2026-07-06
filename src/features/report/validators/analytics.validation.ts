import { z } from "zod";

export const analyticsSchema = z
  .object({
    mode: z.enum(["daily", "weekly", "monthly", "yearly"]),

    date: z.string().optional(),

    from: z.string().optional(),

    to: z.string().optional(),

    year: z.coerce.number().optional(),

    month: z.coerce.number().min(1).max(12).optional(),
  })
  .superRefine((data, ctx) => {
    switch (data.mode) {
      case "daily":
        if (!data.date) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["date"],
            message: "date is required when mode=daily",
          });
        }
        break;

      case "weekly":
        if (!data.from) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["from"],
            message: "from is required when mode=weekly",
          });
        }

        if (!data.to) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["to"],
            message: "to is required when mode=weekly",
          });
        }
        break;

      case "monthly":
        if (!data.year) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["year"],
            message: "year is required when mode=monthly",
          });
        }

        if (!data.month) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["month"],
            message: "month is required when mode=monthly",
          });
        }
        break;

      case "yearly":
        if (!data.year) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["year"],
            message: "year is required when mode=yearly",
          });
        }
        break;
    }
  });