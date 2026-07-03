// src/modules/biometric/biometric.validation.ts

import { z } from "zod";

export const biometricEventSchema = z.object({
  deviceId: z.string().min(1),

  timestamp: z
    .string()
    .datetime(),

  verified: z.boolean(),

  method: z.enum([
    "fingerprint",
    "face",
    "rfid",
    "qr",
  ]),

  employeeNumber: z
    .string()
    .optional(),

  deviceUserId: z
    .string()
    .optional(),

  payload: z
    .unknown()
    .optional(),
});

export type BiometricEventInput =
  z.infer<typeof biometricEventSchema>;

export const registerDeviceSchema =
  z.object({
    code: z.string().min(1),

    name: z.string().min(1),

    provider: z.enum([
      "MOCK",
      "ZKTECO",
      "SUPREMA",
    ]),

    ipAddress: z
      .string()
      .optional(),

    location: z
      .string()
      .optional(),
  });