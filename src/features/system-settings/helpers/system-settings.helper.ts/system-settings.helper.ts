// import { prisma } from "../../../../libs/lib/prisma";

import { prisma } from "../../../../libs/lib/prisma";
import { getSystemCache, setSystemCache } from "../../../shared/cache/system.cache";


// export const getSystemSettings = async () => {
//   const settings = await prisma.system_settings.findFirst();

//   if (!settings) {
//     throw new Error("System settings not initialized.");
//   }

//   return settings;
// };



export const getSystemSettings = async () => {

    const cached = getSystemCache();

    if (cached) {
        return cached;
    }

    let settings = await prisma.system_settings.findFirst();

    if (!settings) {

        settings = await prisma.system_settings.create({
            data: {},
        });

    }

    setSystemCache(settings);

    return settings;

};


