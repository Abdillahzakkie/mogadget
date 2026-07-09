import { describe, expect, it } from "vitest";
import type { IAdminProductDto } from "@/server/validators/types";
import {
  applyProductFilters,
  DEFAULT_FILTERS,
  type IProductFilters,
  matchesFilters,
} from "./productFilters";

function prod(over: Partial<IAdminProductDto>): IAdminProductDto {
  return {
    id: "1",
    slug: "s",
    name: "iPhone 13",
    category: "PHONES",
    brand: "iPhone",
    condition: "UK_USED",
    cosmeticGrade: "A",
    priceNaira: 485000,
    description: null,
    stockType: "UNIQUE_UNIT",
    status: "AVAILABLE",
    quantity: null,
    isVisible: true,
    images: [],
    specs: [],
    whatsappClickCount: 0,
    instagramClickCount: 0,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}
const f = (over: Partial<IProductFilters>): IProductFilters => ({ ...DEFAULT_FILTERS, ...over });

describe("matchesFilters", () => {
  it("passes everything with default (empty) filters", () => {
    expect(matchesFilters(prod({}), DEFAULT_FILTERS)).toBe(true);
  });
  it("text search matches name or brand, case-insensitively", () => {
    expect(matchesFilters(prod({ name: "Galaxy S21", brand: "Samsung" }), f({ q: "samsung" }))).toBe(true);
    expect(matchesFilters(prod({ name: "Galaxy S21", brand: "Samsung" }), f({ q: "pixel" }))).toBe(false);
  });
  it("facets filter by exact value", () => {
    expect(matchesFilters(prod({ category: "PHONES" }), f({ category: "LAPTOPS" }))).toBe(false);
    expect(matchesFilters(prod({ status: "SOLD" }), f({ status: "SOLD" }))).toBe(true);
    expect(matchesFilters(prod({ stockType: "UNIQUE_UNIT" }), f({ stockType: "RESTOCKABLE" }))).toBe(false);
  });
  it("visibility filter distinguishes visible/hidden", () => {
    expect(matchesFilters(prod({ isVisible: false }), f({ visibility: "hidden" }))).toBe(true);
    expect(matchesFilters(prod({ isVisible: false }), f({ visibility: "visible" }))).toBe(false);
  });
  it("price range is inclusive on both ends", () => {
    expect(matchesFilters(prod({ priceNaira: 100 }), f({ min: 100, max: 200 }))).toBe(true);
    expect(matchesFilters(prod({ priceNaira: 99 }), f({ min: 100 }))).toBe(false);
    expect(matchesFilters(prod({ priceNaira: 201 }), f({ max: 200 }))).toBe(false);
  });
});

describe("applyProductFilters", () => {
  const a = prod({ id: "a", priceNaira: 100, createdAt: "2026-01-01T00:00:00.000Z", whatsappClickCount: 1, instagramClickCount: 0 });
  const b = prod({ id: "b", priceNaira: 300, createdAt: "2026-03-01T00:00:00.000Z", whatsappClickCount: 5, instagramClickCount: 5 });
  const c = prod({ id: "c", priceNaira: 200, createdAt: "2026-02-01T00:00:00.000Z", whatsappClickCount: 0, instagramClickCount: 0 });
  const all = [a, b, c];

  it("sorts newest first by default", () => {
    expect(applyProductFilters(all, DEFAULT_FILTERS).map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
  it("sorts by price ascending and descending", () => {
    expect(applyProductFilters(all, f({ sort: "price_asc" })).map((p) => p.id)).toEqual(["a", "c", "b"]);
    expect(applyProductFilters(all, f({ sort: "price_desc" })).map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
  it("sorts by total clicks", () => {
    expect(applyProductFilters(all, f({ sort: "clicks_desc" })).map((p) => p.id)).toEqual(["b", "a", "c"]);
    expect(applyProductFilters(all, f({ sort: "clicks_asc" })).map((p) => p.id)).toEqual(["c", "a", "b"]);
  });
  it("filters then sorts, and does not mutate the input array", () => {
    const out = applyProductFilters(all, f({ min: 150, sort: "price_asc" }));
    expect(out.map((p) => p.id)).toEqual(["c", "b"]);
    expect(all.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});
