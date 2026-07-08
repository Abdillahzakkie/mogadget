import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import { Product } from "../../models/products";
import createProduct from "./createProduct";
import listProducts, { getQueryKey } from "./listProducts";

const input = {
  name: "Svc Test Phone",
  category: "PHONES",
  brand: "iPhone",
  condition: "UK_USED",
  cosmeticGrade: "A",
  priceNaira: 300000,
  stockType: "UNIQUE_UNIT",
  status: "AVAILABLE",
  quantity: null,
  specs: [],
  isVisible: true,
} as const;

describe("products service caching", () => {
  beforeAll(async () => {
    await connectMongoDB();
    await connectRedis();
    await Product.deleteMany({ name: /Svc Test/ });
    await redis.flushdb();
  });
  afterAll(async () => {
    await Product.deleteMany({ name: /Svc Test/ });
    await redis.flushdb();
    await redis.quit();
    await disconnectMongoDB();
  });
  it("caches a non-empty list under the globbable key", async () => {
    await createProduct(input as never);
    const first = await listProducts({ category: "PHONES" });
    expect(first.length).toBeGreaterThan(0);
    expect(await redis.get(getQueryKey({ category: "PHONES" }))).not.toBeNull();
  });
  it("invalidates the list cache on create", async () => {
    await listProducts({ category: "PHONES" });
    await createProduct({ ...input, name: "Svc Test Phone 2" } as never);
    expect(await redis.get(getQueryKey({ category: "PHONES" }))).toBeNull();
  });
  it("never caches an empty result set", async () => {
    const filter = { max: 1 }; // nothing costs ≤ ₦1
    expect(await listProducts(filter)).toEqual([]);
    expect(await redis.get(getQueryKey(filter))).toBeNull();
  });
  it("keys array filters by joining values", () => {
    expect(getQueryKey({ condition: ["NEW", "UK_USED"] })).toContain("NEW,UK_USED");
  });
});
