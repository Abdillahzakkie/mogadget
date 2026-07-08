"use client";

import { CatalogFilters } from "@/components/CatalogFilters";
import { ProductCard } from "@/components/ProductCard";
import type { IFacets } from "@/lib/publicApi";
import type { IProductDto } from "@/server/validators/types";
import { EmptyHint, EmptyState, EmptyTitle, ListingCount, PageHead, PageTitle } from "./styled";

export default function CatalogWrapper({
  products,
  facets,
}: {
  products: IProductDto[];
  facets: IFacets;
}) {
  return (
    <>
      <PageHead>
        <PageTitle>Shop all gadgets</PageTitle>
        <ListingCount>
          {products.length} {products.length === 1 ? "listing" : "listings"}
        </ListingCount>
      </PageHead>

      <div className="catalog-layout">
        <CatalogFilters facets={facets} />
        <div>
          {products.length === 0 ? (
            <EmptyState>
              <EmptyTitle>Nothing matches those filters.</EmptyTitle>
              <EmptyHint>Try widening your price range or clearing a filter.</EmptyHint>
            </EmptyState>
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
