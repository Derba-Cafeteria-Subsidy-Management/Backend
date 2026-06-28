import { z } from "zod";

export const updateAuthenticationSettingsSchema = z
  .object({
    fingerprintEnabled: z.boolean(),

    employeeSearchEnabled: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (
      !value.fingerprintEnabled &&
      !value.employeeSearchEnabled
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "At least one employee identification method must remain enabled.",
      });
    }
  });

export type UpdateAuthenticationSettingsInput =
  z.infer<typeof updateAuthenticationSettingsSchema>;