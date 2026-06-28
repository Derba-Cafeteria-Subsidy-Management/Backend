
import { prisma } from "../../../libs/lib/prisma.js";
import { getSystemSettings } from "../helpers/system-settings.helper.ts/system-settings.helper.js";
import { UpdateAuthenticationSettingsInput } from "../types/system-settings.types.js";


export const getAuthenticationSettings = async () => {
  const settings = await getSystemSettings();

  return {
    fingerprintEnabled: settings.fingerprintEnabled,
    employeeSearchEnabled: settings.employeeSearchEnabled,
  };
};

export const updateAuthenticationSettings = async (
  input: UpdateAuthenticationSettingsInput,
  updatedById: string
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

  await prisma.auditLog.create({
  data: {
    action: "SYSTEM_SETTINGS_UPDATED",
    userId: updatedById,
    meta: {
      fingerprintEnabled: input.fingerprintEnabled,
      employeeSearchEnabled: input.employeeSearchEnabled,
    },
  },
});

  return {
    fingerprintEnabled: updated.fingerprintEnabled,
    employeeSearchEnabled: updated.employeeSearchEnabled,
  };
};