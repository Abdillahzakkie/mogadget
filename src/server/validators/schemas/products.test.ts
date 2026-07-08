import { describe, expect, it } from "vitest";
import { clickSchema, createProductSchema, productFilterSchema } from "./index";

describe("createProductSchema", () => {
  const base = {
    name: "iPhone 13",
    category: "PHONES",
    brand: "iPhone",
    priceNaira: 485000,
    condition: "UK_USED",
    cosmeticGrade: "A",
    stockType: "UNIQUE_UNIT",
    status: "AVAILABLE",
  };
  it("accepts a valid pre-owned product", () => {
    expect(createProductSchema.safeParse(base).success).toBe(true);
  });
  it("rejects a non-integer price", () => {
    expect(createProductSchema.safeParse({ ...base, priceNaira: 485000.5 }).success).toBe(false);
  });
  it("rejects a zero price", () => {
    expect(createProductSchema.safeParse({ ...base, priceNaira: 0 }).success).toBe(false);
  });
});

describe("clickSchema", () => {
  it("accepts whatsapp/instagram only", () => {
    expect(clickSchema.safeParse({ channel: "whatsapp" }).success).toBe(true);
    expect(clickSchema.safeParse({ channel: "email" }).success).toBe(false);
  });
});

describe("productFilterSchema", () => {
  it("coerces numeric price bounds from strings", () => {
    const r = productFilterSchema.parse({ min: "100000", max: "500000" });
    expect(r.min).toBe(100000);
    expect(r.max).toBe(500000);
  });
});
