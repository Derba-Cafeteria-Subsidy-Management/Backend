
import { prisma } from "../../../libs/lib/prisma.js";
import { createAuditLog } from "../../auth/service/audit.service.js";
import { setSystemCache } from "../../shared/cache/system.cache.js";
import { getSystemSettings } from "../helpers/system-settings.helper.ts/system-settings.helper.js";
import { CreateSystemContext, UpdateAuthenticationSettingsInput } from "../types/system-settings.types.js";


export const getAuthenticationSettings = async () => {
  const settings = await getSystemSettings();

  return {
    fingerprintEnabled: settings.fingerprintEnabled,
    employeeSearchEnabled: settings.employeeSearchEnabled,
  };
};

export const updateAuthenticationSettings = async (
  input: UpdateAuthenticationSettingsInput,
  updatedById: string,

   context: CreateSystemContext
) => {
  const existing = await getSystemSettings();

  const updated = await prisma.system_settings.update({
    where: {
      id: existing.id,
    },
    data: {
      fingerprintEnabled: input.fingerprintEnabled,
      employeeSearchEnabled: input.employeeSearchEnabled,
      updatedById,
    },
  });

  setSystemCache(updated);

//   await prisma.auditLog.create({
//   data: {
//     action: "SYSTEM_SETTINGS_UPDATED",
//     userId: updatedById,
//     meta: {
//       fingerprintEnabled: input.fingerprintEnabled,
//       employeeSearchEnabled: input.employeeSearchEnabled,
//     },
//   },
// });

   await createAuditLog({
           userId: updatedById,
           action: 'SYSTEM_SETTINGS_UPDATED',
           entityType: 'System_settings',
           entityId: updated.id,
           metadata: {
             fingerprintEnabled: input.fingerprintEnabled,
             employeeSearchEnabled: input.employeeSearchEnabled,
           },
           ipAddress: context.ipAddress,
           userAgent: context.userAgent,
         });
        

        
  return {
    fingerprintEnabled: updated.fingerprintEnabled,
    employeeSearchEnabled: updated.employeeSearchEnabled,
  };
};