import { describe, expect, it } from "vitest";
import { parseProductFilter } from "./parseSearchParams";

const url = (qs: string) => new URL(`http://x/api/products?${qs}`);

describe("parseProductFilter", () => {
  it("defaults sort to newest and leaves optional keys undefined", () => {
    const f = parseProductFilter(url(""));
    expect(f.sort).toBe("newest");
    expect(f.category).toBeUndefined();
    expect(f.condition).toBeUndefined();
  });

  it("parses category, search, repeated condition/brand, and coerces price", () => {
    const f = parseProductFilter(
      url(
        "category=PHONES&q=iphone&condition=NEW&condition=UK_USED&brand=iPhone&min=100000&max=500000&sort=price_asc",
      ),
    );
    expect(f.category).toBe("PHONES");
    expect(f.q).toBe("iphone");
    expect(f.condition).toEqual(["NEW", "UK_USED"]);
    expect(f.brand).toEqual(["iPhone"]);
    expect(f.min).toBe(100000);
    expect(f.max).toBe(500000);
    expect(f.sort).toBe("price_asc");
  });

  it("rejects an invalid category", () => {
    expect(() => parseProductFilter(url("category=BOGUS"))).toThrowError();
  });
});
