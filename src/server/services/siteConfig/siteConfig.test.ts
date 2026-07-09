import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import * as redisMod from "../../databases/redis";
import { connectRedis, redis } from "../../databases/redis";
import { SiteConfig } from "../../models/siteConfig";
import { SITE_CONFIG_DEFAULTS } from "./defaults";
import getSiteConfig, { SITE_CONFIG_CACHE_KEY } from "./getSiteConfig";
import updateSiteConfig from "./updateSiteConfig";

describe("siteConfig service", () => {
  beforeAll(async () => {
    await connectMongoDB();
    await connectRedis();
  });
  afterEach(async () => {
    await SiteConfig.deleteMany({});
    await redis.del(SITE_CONFIG_CACHE_KEY);
    vi.restoreAllMocks();
  });
  afterAll(async () => {
    await SiteConfig.deleteMany({});
    await redis.flushdb();
    await redis.quit();
    await disconnectMongoDB();
  });

  it("returns compile-time defaults on a cold database", async () => {
    const cfg = await getSiteConfig({ refreshCache: true });
    expect(cfg.businessName).toBe(SITE_CONFIG_DEFAULTS.businessName);
    expect(cfg.contact.whatsapp).toBe(SITE_CONFIG_DEFAULTS.contact.whatsapp);
    expect(cfg.toggles.showSoldListings).toBe(true);
  });

  it("persists a patch and reflects it on the next read", async () => {
    await updateSiteConfig({ contact: { whatsapp: "2348000000000" } });
    const cfg = await getSiteConfig({ refreshCache: true });
    expect(cfg.contact.whatsapp).toBe("2348000000000");
    // Untouched fields keep their defaults.
    expect(cfg.contact.instagram).toBe(SITE_CONFIG_DEFAULTS.contact.instagram);
    expect(cfg.businessName).toBe(SITE_CONFIG_DEFAULTS.businessName);
  });

  it("merges patches across sections without clobbering", async () => {
    await updateSiteConfig({ businessName: "MoGadget NG", toggles: { maintenanceMode: true } });
    await updateSiteConfig({ tagline: "Best gadgets" });
    const cfg = await getSiteConfig({ refreshCache: true });
    expect(cfg.businessName).toBe("MoGadget NG");
    expect(cfg.tagline).toBe("Best gadgets");
    expect(cfg.toggles.maintenanceMode).toBe(true);
    expect(cfg.toggles.showSoldListings).toBe(true);
  });

  it("serves a warm cache without hitting the database", async () => {
    // Prime the cache.
    await getSiteConfig({ refreshCache: true });
    const dbSpy = vi.spyOn(SiteConfig, "findOne");
    const cfg = await getSiteConfig();
    expect(cfg.businessName).toBe(SITE_CONFIG_DEFAULTS.businessName);
    expect(dbSpy).not.toHaveBeenCalled();
  });

  it("refreshes the cache after an update", async () => {
    await getSiteConfig({ refreshCache: true }); // warm cache with defaults
    await updateSiteConfig({ tagline: "Fresh" });
    // A plain read (cache-first) must already see the new value.
    const cached = await redisMod.redisRetrieveKeyString<{ tagline: string }>(
      SITE_CONFIG_CACHE_KEY,
    );
    expect(cached?.tagline).toBe("Fresh");
    const cfg = await getSiteConfig();
    expect(cfg.tagline).toBe("Fresh");
  });
});
