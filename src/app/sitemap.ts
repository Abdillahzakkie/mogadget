import type { MetadataRoute } from "next";
import { SITE_URL } from "../constants/site";
import { getProducts } from "../lib/publicApi";

// Public sitemap: static pages + every visible product (spec §9 — SEO for a chat-to-sell
// business). Hidden products never appear (getProducts returns only visible ones).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = ["", "/products", "/contact"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.7,
  }));
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  return [...staticRoutes, ...productRoutes];
}
