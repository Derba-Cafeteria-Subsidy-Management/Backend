import { cacheDel } from "../../../libs/lib/cache";
import {
  bumpMenuCacheVersion,
  buildCurrentPriceKey,
  buildMenuKey,
  buildPriceHistoryKey,
} from "./menu-cache.helper";

export async function invalidateMenuCache(menuId?: string) {
  await bumpMenuCacheVersion();

  if (!menuId) return;

  await Promise.all([
    cacheDel(buildMenuKey(menuId)),
    cacheDel(buildPriceHistoryKey(menuId)),
    cacheDel(buildCurrentPriceKey(menuId)),
  ]);
}