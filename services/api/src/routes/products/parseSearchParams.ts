import { productFilterSchema, type TProductFilter } from "@mogadget/contracts/schemas";

export function parseProductFilter(url: URL): TProductFilter {
  const p = url.searchParams;
  return productFilterSchema.parse({
    category: p.get("category") ?? undefined,
    q: p.get("q") ?? undefined,
    condition: p.getAll("condition").length ? p.getAll("condition") : undefined,
    brand: p.getAll("brand").length ? p.getAll("brand") : undefined,
    min: p.get("min") ?? undefined,
    max: p.get("max") ?? undefined,
    sort: p.get("sort") ?? undefined,
  });
}
