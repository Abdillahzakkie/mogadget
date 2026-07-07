import type { Metadata } from "next";
import { getProducts, getFacets, buildProductQuery } from "../../../lib/publicApi";
import { ProductCard } from "../../../components/ProductCard";
import { CatalogFilters } from "../../../components/CatalogFilters";

export const metadata: Metadata = {
  title: "Shop all gadgets — MoGadget",
  description:
    "Browse new & pre-owned phones, laptops, audio and consoles. Graded, tested, firm prices. Chat to order.",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const [products, facets] = await Promise.all([getProducts(buildProductQuery(sp)), getFacets()]);

  return (
    <>
      <div style={{ padding: "28px 0 4px" }}>
        <h1 style={{ font: "600 30px var(--font-display)", margin: "0 0 6px" }}>Shop all gadgets</h1>
        <p style={{ color: "rgba(20,21,24,.6)", margin: 0 }}>
          {products.length} {products.length === 1 ? "listing" : "listings"}
        </p>
      </div>

      <div className="catalog-layout">
        <CatalogFilters facets={facets} />
        <div>
          {products.length === 0 ? (
            <div style={empty}>
              <p style={{ font: "600 18px var(--font-display)", margin: "0 0 6px" }}>
                Nothing matches those filters.
              </p>
              <p style={{ color: "var(--sold)", margin: 0 }}>
                Try widening your price range or clearing a filter.
              </p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const empty = {
  border: "1px dashed rgba(20,21,24,.18)",
  borderRadius: 14,
  padding: "48px 24px",
  textAlign: "center" as const,
};
