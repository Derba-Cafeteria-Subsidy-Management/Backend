import { cacheGet, cacheSet } from "../../../libs/lib/cache";


const MENU_VERSION_KEY = "menu:version";

export async function getMenuCacheVersion(): Promise<number> {
  const version = await cacheGet<number>(MENU_VERSION_KEY);

  if (version !== null) return version;

  await cacheSet(MENU_VERSION_KEY, 1);

  return 1;
}

export async function bumpMenuCacheVersion(): Promise<number> {
  const version = (await getMenuCacheVersion()) + 1;

  await cacheSet(MENU_VERSION_KEY, version);

  return version;
}

export async function buildMenuListKey(
  activeOnly: boolean,
  page: number,
  pageSize: number,
  query?: string
) {
  const version = await getMenuCacheVersion();

  return `menu:list:v${version}:${activeOnly}:${page}:${pageSize}:${query ?? ""}`;
}

export function buildMenuKey(menuId: string) {
  return `menu:${menuId}`;
}

export function buildPriceHistoryKey(menuId: string) {
  return `menu:history:${menuId}`;
}

export function buildCurrentPriceKey(menuId: string) {
  return `menu:price:${menuId}`;
}