
import { Prisma } from "@prisma/client";
import { prisma } from "../../../libs/lib/prisma";


export const biometricRepository = {

  findDevice(code: string) {
    return prisma.device.findUnique({
      where: {
        code,
      },
    });
  },

  findEmployeeByNumber(employeeNumber: string) {
    return prisma.employees.findUnique({
      where: {
        Employee_number : employeeNumber,
      },
    });
  },

  findEmployeeByDeviceUser(
    deviceId: string,
    deviceUserId: string
  ) {
    return prisma.biometricMapping.findUnique({
      where: {
        deviceId_deviceUserId: {
          deviceId,
          deviceUserId,
        },
      },

      include: {
        employee: true,
      },
    });
  },

//   createScanLog(data: {
//     deviceId: string;
//     employeeId?: string;
//     verified: boolean;
//     payload?: Prisma.InputJsonValue;
//     scannedAt: Date;
//   }) {
//     return prisma.scanLog.create({
//         data: {
//             deviceId: data.deviceId,
//             employeeId: data.employeeId ?? null,
//             verified: data.verified,
//             payload: data.payload,
//             scannedAt: data.scannedAt,
//         },
//     });
//   },

};