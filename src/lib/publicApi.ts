import type { IProductDto } from "@/server/validators/types";

// Server-side reads fetch this same app over loopback (SITE_URL), tagged for on-demand ISR:
// an admin mutation calls revalidateTag() in-process with these same tags, refreshing the
// affected pages within seconds. `revalidate: 300` is a time-based backstop. Tag strings
// MUST match src/server/lib/revalidate's revalidateTags.
const SELF_ORIGIN = process.env.SITE_URL ?? "http://localhost:3000";
const REVALIDATE_SECONDS = 300;

export const tags = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
};

export interface IFacets {
  categories: Record<string, number>;
  conditions: Record<string, number>;
}

async function apiGet<T>(path: string, cacheTags: string[]): Promise<T | null> {
  try {
    const res = await fetch(`${SELF_ORIGIN}${path}`, {
      next: { tags: cacheTags, revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: T | null };
    return json.data;
  } catch {
    return null;
  }
}

// Turns Next's parsed searchParams into the API's product-filter query string,
// forwarding only recognised keys (arrays repeat the key: ?condition=NEW&condition=UK_USED).
export function buildProductQuery(sp: Record<string, string | string[] | undefined>): string {
  const qs = new URLSearchParams();
  const add = (key: string, value: string | string[] | undefined) => {
    if (value == null) return;
    if (Array.isArray(value)) value.forEach((v) => v && qs.append(key, v));
    else if (value) qs.set(key, value);
  };
  add("category", sp.category);
  add("q", sp.q);
  add("condition", sp.condition);
  add("brand", sp.brand);
  add("min", sp.min);
  add("max", sp.max);
  add("sort", sp.sort);
  return qs.toString();
}

export async function getProducts(query = ""): Promise<IProductDto[]> {
  const path = `/api/products${query ? `?${query}` : ""}`;
  return (await apiGet<IProductDto[]>(path, [tags.products])) ?? [];
}

export async function getFacets(): Promise<IFacets> {
  return (
    (await apiGet<IFacets>("/api/products/facets", [tags.products])) ?? {
      categories: {},
      conditions: {},
    }
  );
}

export async function getProduct(slug: string): Promise<IProductDto | null> {
  return apiGet<IProductDto>(`/api/products/${encodeURIComponent(slug)}`, [
    tags.products,
    tags.product(slug),
  ]);
}
