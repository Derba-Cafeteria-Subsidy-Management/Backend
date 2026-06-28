import { prisma } from "../../../../libs/lib/prisma";


export const getSystemSettings = async () => {
  const settings = await prisma.system_settings.findFirst();

  if (!settings) {
    throw new Error("System settings not initialized.");
  }

  return settings;
};