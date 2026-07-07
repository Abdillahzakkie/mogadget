import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import { Product } from "../../models/products";
import createProduct from "./createProduct";
import updateProduct from "./updateProduct";
import setStatus from "./setStatus";
import setVisibility from "./setVisibility";
import deleteProduct from "./deleteProduct";
import incrementClick from "./incrementClick";
import getProductBySlug, { getQueryKey as bySlugKey } from "./getProductBySlug";
import productFacets, { FACETS_KEY } from "./productFacets";

const MISSING_ID = "0123456789abcdef01234567";

const newPhone = {
  name: "SvcOps New Phone",
  category: "PHONES",
  brand: "iPhone",
  condition: "NEW",
  cosmeticGrade: null,
  priceNaira: 500000,
  stockType: "RESTOCKABLE",
  status: "IN_STOCK",
  quantity: 5,
  description: null,
  images: [],
  specs: [],
} as const;

const usedPhone = {
  name: "SvcOps Used Phone",
  category: "PHONES",
  brand: "iPhone",
  condition: "UK_USED",
  cosmeticGrade: "A",
  priceNaira: 300000,
  stockType: "UNIQUE_UNIT",
  status: "AVAILABLE",
  quantity: null,
  description: null,
  images: [],
  specs: [],
} as const;

describe("product services (mutations + caching)", () => {
  beforeAll(async () => {
    await connectMongoDB();
    await connectRedis();
    await Product.deleteMany({ name: /SvcOps/ });
  });
  afterAll(async () => {
    await Product.deleteMany({ name: /SvcOps/ });
    await redis.quit();
    await disconnectMongoDB();
  });

  it("createProduct enforces the taxonomy invariant", async () => {
    // NEW must not carry a cosmetic grade.
    await expect(
      createProduct({ ...newPhone, cosmeticGrade: "A" } as never),
    ).rejects.toBeDefined();
  });

  it("createProduct persists a valid product and returns a slug", async () => {
    const doc = await createProduct(newPhone as never);
    expect(doc).toBeTruthy();
    expect(doc!.slug).toMatch(/^svcops-new-phone/);
    expect(doc!.status).toBe("IN_STOCK");
  });

  it("getProductBySlug caches on miss and serves from cache on hit", async () => {
    const created = await createProduct({ ...usedPhone } as never);
    const slug = created!.slug;
    await redis.del(bySlugKey({ slug }));

    const first = await getProductBySlug({ slug });
    expect(first?.slug).toBe(slug);
    expect(await redis.get(bySlugKey({ slug }))).not.toBeNull(); // now cached

    // Delete the DB row but keep the cache → cached copy is still served.
    await Product.deleteOne({ slug });
    const cached = await getProductBySlug({ slug });
    expect(cached?.slug).toBe(slug);

    // refreshCache bypasses the cache → now reflects the deletion.
    const fresh = await getProductBySlug({ slug, refreshCache: true });
    expect(fresh).toBeNull();
  });

  it("updateProduct filters unknown keys, re-checks invariants, and persists", async () => {
    const created = await createProduct({ ...usedPhone, name: "SvcOps Upd" } as never);
    const id = String(created!._id);

    const updated = await updateProduct({
      id,
      // slug is not an allowed update key → silently ignored; price is applied.
      patch: { priceNaira: 275000, slug: "hacked" } as never,
    });
    expect(updated!.priceNaira).toBe(275000);
    expect(updated!.slug).toBe(created!.slug); // unchanged

    // Invalid transition: a UNIQUE_UNIT cannot become IN_STOCK.
    await expect(updateProduct({ id, patch: { status: "IN_STOCK" } })).rejects.toBeDefined();

    // Unknown id → null.
    expect(await updateProduct({ id: MISSING_ID, patch: { priceNaira: 1 } })).toBeNull();
  });

  it("setStatus validates the transition and persists; missing → null", async () => {
    const created = await createProduct({ ...newPhone, name: "SvcOps Status" } as never);
    const id = String(created!._id);

    const ooS = await setStatus({ id, status: "OUT_OF_STOCK" });
    expect(ooS!.status).toBe("OUT_OF_STOCK");

    // NEW/RESTOCKABLE cannot jump to AVAILABLE (that is a UNIQUE_UNIT state).
    await expect(setStatus({ id, status: "AVAILABLE" })).rejects.toBeDefined();

    expect(await setStatus({ id: MISSING_ID, status: "IN_STOCK" })).toBeNull();
  });

  it("setVisibility toggles and persists; missing → null", async () => {
    const created = await createProduct({ ...usedPhone, name: "SvcOps Vis" } as never);
    const id = String(created!._id);
    const hidden = await setVisibility({ id, isVisible: false });
    expect(hidden!.isVisible).toBe(false);
    expect(await setVisibility({ id: MISSING_ID, isVisible: true })).toBeNull();
  });

  it("deleteProduct removes an existing product; missing → false", async () => {
    const created = await createProduct({ ...usedPhone, name: "SvcOps Del" } as never);
    const id = String(created!._id);
    expect(await deleteProduct({ id })).toBe(true);
    expect(await deleteProduct({ id })).toBe(false); // already gone
    expect(await deleteProduct({ id: MISSING_ID })).toBe(false);
  });

  it("incrementClick bumps the channel counter; unknown slug → false", async () => {
    const created = await createProduct({ ...newPhone, name: "SvcOps Click" } as never);
    const slug = created!.slug;
    expect(await incrementClick({ slug, channel: "whatsapp" })).toBe(true);
    expect(await incrementClick({ slug, channel: "instagram" })).toBe(true);
    const row = await Product.findOne({ slug }).lean();
    expect(row!.whatsappClickCount).toBe(1);
    expect(row!.instagramClickCount).toBe(1);
    expect(await incrementClick({ slug: "does-not-exist", channel: "whatsapp" })).toBe(false);
  });

  it("productFacets returns aggregated counts and caches them", async () => {
    await redis.del(FACETS_KEY);
    await createProduct({ ...newPhone, name: "SvcOps Facet" } as never);
    const facets = await productFacets();
    expect(facets.categories.PHONES).toBeGreaterThan(0);
    expect(await redis.get(FACETS_KEY)).not.toBeNull();
    // Second call is served from cache (same shape).
    const again = await productFacets();
    expect(again).toEqual(facets);
  });
});
