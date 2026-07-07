import { describe, it, expect, vi, afterEach } from "vitest";
import { buildProductQuery, getProducts, getFacets, getProduct, tags } from "./publicApi";

describe("buildProductQuery", () => {
  it("forwards only recognised keys and repeats array keys", () => {
    const qs = buildProductQuery({
      category: "PHONES",
      q: "iphone",
      condition: ["NEW", "UK_USED"],
      brand: ["iPhone"],
      min: "100000",
      max: "500000",
      sort: "price_asc",
      bogus: "x", // ignored
    });
    const p = new URLSearchParams(qs);
    expect(p.get("category")).toBe("PHONES");
    expect(p.getAll("condition")).toEqual(["NEW", "UK_USED"]);
    expect(p.get("min")).toBe("100000");
    expect(p.has("bogus")).toBe(false);
  });
  it("drops empty values", () => {
    expect(buildProductQuery({ q: undefined, category: "" })).toBe("");
  });
});

describe("tag helpers", () => {
  it("builds stable cache tags", () => {
    expect(tags.products).toBe("products");
    expect(tags.product("abc")).toBe("product:abc");
  });
});

describe("public fetchers", () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = (ok: boolean, data: unknown) =>
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok, json: async () => ({ data }) }),
    );

  it("getProducts returns the data array on success", async () => {
    stub(true, [{ slug: "a" }]);
    expect(await getProducts("category=PHONES")).toEqual([{ slug: "a" }]);
  });
  it("getProducts returns [] on a non-OK response", async () => {
    stub(false, null);
    expect(await getProducts()).toEqual([]);
  });
  it("getProducts returns [] when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await getProducts()).toEqual([]);
  });
  it("getFacets falls back to empty maps", async () => {
    stub(false, null);
    expect(await getFacets()).toEqual({ categories: {}, conditions: {} });
  });
  it("getProduct returns null when missing", async () => {
    stub(false, null);
    expect(await getProduct("nope")).toBeNull();
  });
  it("getProduct returns the product on success", async () => {
    stub(true, { slug: "x" });
    expect(await getProduct("x")).toEqual({ slug: "x" });
  });
});
