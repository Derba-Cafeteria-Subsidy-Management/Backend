import { system_settings, Subsidy_config } from "@prisma/client";

interface CacheItem<T> {
    value: T;
    expires: number;
}

const TTL = 1000 * 60 * 10; // 10 minutes

const systemCache = new Map<string, CacheItem<system_settings>>();

const subsidyCache = new Map<string, CacheItem<Subsidy_config>>();

export function getSystemCache() {
    const item = systemCache.get("settings");

    if (!item) return null;

    if (item.expires < Date.now()) {
        systemCache.delete("settings");
        return null;
    }

    return item.value;
}

export function setSystemCache(value: system_settings) {
    systemCache.set("settings", {
        value,
        expires: Date.now() + TTL,
    });
}

export function clearSystemCache() {
    systemCache.delete("settings");
}

export function getSubsidyCache() {
    const item = subsidyCache.get("current");

    if (!item) return null;

    if (item.expires < Date.now()) {
        subsidyCache.delete("current");
        return null;
    }

    return item.value;
}

export function setSubsidyCache(value: Subsidy_config) {
    subsidyCache.set("current", {
        value,
        expires: Date.now() + TTL,
    });
}

export function clearSubsidyCache() {
    subsidyCache.delete("current");
}