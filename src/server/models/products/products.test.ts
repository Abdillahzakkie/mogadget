import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import {
  createProductDB,
  getProductBySlugDB,
  incrementClickDB,
  listProductsDB,
  Product,
} from "./index";

const p = {
  slug: "iphone-13-test-ab12",
  name: "iPhone 13",
  category: "PHONES",
  brand: "iPhone",
  condition: "UK_USED",
  cosmeticGrade: "A",
  priceNaira: 485000,
  stockType: "UNIQUE_UNIT",
  status: "AVAILABLE",
  quantity: null,
  isVisible: true,
} as const;

describe("products model *DB", () => {
  beforeAll(async () => {
    await connectMongoDB();
    await Product.deleteMany({ slug: /test/ });
  });
  afterAll(async () => {
    await Product.deleteMany({ slug: /test/ });
    await disconnectMongoDB();
  });
  it("creates and reads by slug", async () => {
    const created = await createProductDB(p);
    expect(created?.slug).toBe(p.slug);
    expect((await getProductBySlugDB({ slug: p.slug }))?.name).toBe("iPhone 13");
  });
  it("increments a click counter by slug and returns the product id", async () => {
    const id = await incrementClickDB({ slug: p.slug, channel: "whatsapp" });
    expect(typeof id).toBe("string");
    expect((await getProductBySlugDB({ slug: p.slug }))?.whatsappClickCount).toBe(1);
    expect(await incrementClickDB({ slug: "does-not-exist", channel: "whatsapp" })).toBeNull();
  });
  it("hides invisible products from public list", async () => {
    await Product.updateOne({ slug: p.slug }, { $set: { isVisible: false } });
    const list = await listProductsDB({ status: "public" });
    expect(list.find((x) => x.slug === p.slug)).toBeUndefined();
  });
});
