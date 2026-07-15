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

/**
 * Retrieve cached subsidy config for the given policy.
 * Uses the policy string as the cache key so DEFAULT and FULL_COMPANY
 * never collide with each other.
 */
export function getSubsidyCache(policy: string = "DEFAULT"): Subsidy_config | null {
    const item = subsidyCache.get(policy);

    if (!item) return null;

    if (item.expires < Date.now()) {
        subsidyCache.delete(policy);
        return null;
    }

    return item.value;
}

/**
 * Store a subsidy config in the cache, keyed by its policy.
 */
export function setSubsidyCache(policy: string, value: Subsidy_config): void {
    subsidyCache.set(policy, {
        value,
        expires: Date.now() + TTL,
    });
}

/**
 * Clear all cached subsidy configs (all policies).
 */
export function clearSubsidyCache(): void {
    subsidyCache.clear();
}