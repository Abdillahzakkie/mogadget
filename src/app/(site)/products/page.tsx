import type { Metadata } from "next";
import { buildProductQuery, getFacets, getProducts } from "@/lib/publicApi";
import CatalogWrapper from "@/libs/CatalogWrapper";

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

  return <CatalogWrapper products={products} facets={facets} />;
}
