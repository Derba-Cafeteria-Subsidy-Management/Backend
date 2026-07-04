import { redis } from "./redis";

export const cacheSet = async (
  key: string,
  value: any,
  ttlSeconds = 300
) => {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
};

export const cacheDel = async (key: string) => {
  await redis.del(key);
};