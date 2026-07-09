import { redisUpdateKeyString } from "../../databases/redis";
import { revalidatePathNow } from "../../lib/revalidate";
import { upsertSiteConfigDB } from "../../models/siteConfig";
import type { ISiteConfig, ISiteConfigPatch } from "../../models/siteConfig/types";
import { applyConfigPatch, mergeWithDefaults } from "./defaults";
import getSiteConfig, { SITE_CONFIG_CACHE_KEY } from "./getSiteConfig";

const TTL = 5 * 60;

// Persist a partial patch onto the current config: read fresh → merge section-by-section →
// upsert the singleton → refresh the Redis cache synchronously → expire the public ISR cache.
// Returns the complete saved config.
export default async function updateSiteConfig(
  patch: ISiteConfigPatch,
): Promise<ISiteConfig | null> {
  const current = await getSiteConfig({ refreshCache: true });
  const next = applyConfigPatch(current, patch);
  const saved = await upsertSiteConfigDB(next);
  if (!saved) return null;
  const result = mergeWithDefaults(saved);
  await redisUpdateKeyString(SITE_CONFIG_CACHE_KEY, result, true, TTL);
  // Await the purge so the save doesn't report success until the public site will serve the new
  // config on the next request (maintenance mode / contact / SEO must take effect immediately).
  await revalidatePathNow("/", "layout");
  return result;
}
