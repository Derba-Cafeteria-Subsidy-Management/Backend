import { cacheDel } from "../../../libs/lib/cache.js";
import { bumpEmployeeCacheVersion, buildEmployeeKey } from "./employee-cache.helper.js";

export async function invalidateEmployeeCache(employee_number?: string) {
  await bumpEmployeeCacheVersion();

  if (!employee_number) return;

  await cacheDel(buildEmployeeKey(employee_number));
}