// src/modules/biometric/biometric.types.ts

export type VerificationMethod =
  | "fingerprint"
  | "face"
  | "rfid"
  | "qr";

export interface BiometricEvent {
  deviceId: string;
  timestamp: Date;
  verified: boolean;
  method: VerificationMethod;

  /**
   * Recommended if device stores
   * your employee number directly.
   */
  employeeNumber?: string;

  /**
   * Used when device has its own
   * internal user identifier.
   */
  deviceUserId?: string;

  payload?: unknown;
}

export interface DeviceRegistrationInput {
  code: string;
  name: string;
  provider: string;
  ipAddress?: string;
  location?: string;
}

export interface VerificationResult {
  success: boolean;
  employeeId?: string;
  employeeNumber?: string;
  message: string;
}