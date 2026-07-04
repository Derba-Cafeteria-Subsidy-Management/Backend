import { BiometricEvent, VerificationResult } from "../types/biometric.types";
import { biometricRepository } from "./biometric.repository";



export class BiometricService {

  async verifyIdentity(
    event: BiometricEvent
  ): Promise<VerificationResult> {

    //------------------------------------
    // Device Exists?
    //------------------------------------

    const device =
      await biometricRepository.findDevice(
        event.deviceId
      );

    if (!device) {

      throw new Error(
        "Unknown device."
      );

    }

    //------------------------------------
    // Find Employee
    //------------------------------------

    let employee = null;

    if (event.employeeNumber) {

      employee =
        await biometricRepository
          .findEmployeeByNumber(
            event.employeeNumber
          );

    }

    //------------------------------------
    // Mapping Table
    //------------------------------------

    else if (event.deviceUserId) {

      const mapping =
        await biometricRepository
          .findEmployeeByDeviceUser(
            device.id,
            event.deviceUserId
          );

      employee =
        mapping?.employee ?? null;

    }

    //------------------------------------
    // Scan Log
    //------------------------------------

    // await biometricRepository.createScanLog({

    //   deviceId: device.id,

    //   employeeId:
    //     employee?.id,

    //   verified:
    //     event.verified,

    //   payload:
    //     event.payload,

    //   scannedAt:
    //     event.timestamp,

    // });

    //------------------------------------
    // Employee Found?
    //------------------------------------

    if (!employee) {

      return {

        success: false,

        message:
          "Employee not found.",

      };

    }

    //------------------------------------
    // Active?
    //------------------------------------

    if (!employee.status) {

      return {

        success: false,

        employeeId:
          employee.id,

        employeeNumber:
          employee.Employee_number,

        message:
          "Employee is inactive.",

      };

    }

    //------------------------------------
    // Verified?
    //------------------------------------

    if (!event.verified) {

      return {

        success: false,

        employeeId:
          employee.id,

        employeeNumber:
          employee.Employee_number,

        message:
          "Fingerprint verification failed.",

      };

    }

    //------------------------------------
    // Success
    //------------------------------------

    return {

      success: true,

      employeeId:
        employee.id,

      employeeNumber:
        employee.Employee_number,

      message:
        "Identity verified.",

    };

  }

}