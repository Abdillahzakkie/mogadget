import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases/redis";
import { getSiteConfigDB } from "../../models/siteConfig";
import type { ISiteConfig } from "../../models/siteConfig/types";
import { mergeWithDefaults } from "./defaults";

export const SITE_CONFIG_CACHE_KEY = "services:siteConfig:get";
const TTL = 5 * 60;

// Resolve the effective site config: Redis cache → DB singleton → compile-time defaults. Always
// returns a complete config (never null), so every consumer can read fields unconditionally.
export default async function getSiteConfig({
  refreshCache,
}: {
  refreshCache?: boolean;
} = {}): Promise<ISiteConfig> {
  if (!refreshCache) {
    const cached = await redisRetrieveKeyString<ISiteConfig>(SITE_CONFIG_CACHE_KEY);
    if (cached) return cached;
  }
  const merged = mergeWithDefaults(await getSiteConfigDB());
  await redisUpdateKeyString(SITE_CONFIG_CACHE_KEY, merged, true, TTL);
  return merged;
}
