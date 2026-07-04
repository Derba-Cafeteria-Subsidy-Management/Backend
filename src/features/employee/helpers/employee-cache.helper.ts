import { cacheGet, cacheSet } from "../../../libs/lib/cache.js";

const EMPLOYEE_VERSION_KEY = "employee:version";

export async function getEmployeeCacheVersion(): Promise<number> {
  const version = await cacheGet<number>(EMPLOYEE_VERSION_KEY);

  if (version !== null) return version;

  await cacheSet(EMPLOYEE_VERSION_KEY, 1);

  return 1;
}

export async function bumpEmployeeCacheVersion(): Promise<number> {
  const version = (await getEmployeeCacheVersion()) + 1;

  await cacheSet(EMPLOYEE_VERSION_KEY, version);

  return version;
}

export async function buildEmployeeListKey(
  employeeNumber?: string,
  name?: string,
  status?: string,
  page = 1,
  limit = 20
) {
  const version = await getEmployeeCacheVersion();

  return `employee:list:v${version}:${page}:${limit}:${employeeNumber ?? ""}:${name ?? ""}:${status ?? ""}`;
}



export function buildEmployeeKey(employeeNumber?: string,) {
  return `employee:${employeeNumber ?? ""}`;
}