import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/constants/site";
import { formatNaira } from "@/helpers/format";
import { getProduct, getProducts } from "@/lib/publicApi";
import ProductDetailWrapper from "@/libs/ProductDetailWrapper";
import { CONDITION_LABEL } from "@/server/validators/constants";

// Statically pre-render every visible product at build (ISR); on-demand revalidation
// refreshes them when the owner edits. Unknown/hidden slugs fall through to 404.
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found — MoGadget" };

  const cond =
    product.condition === "NEW"
      ? "Brand new"
      : `${CONDITION_LABEL[product.condition]}${product.cosmeticGrade ? ` · Grade ${product.cosmeticGrade}` : ""}`;
  const title = `${product.name} — ${formatNaira(product.priceNaira)} | MoGadget`;
  const description =
    product.description?.trim() ||
    `${cond}. ${product.name} at MoGadget — graded, tested, 1-month warranty. Chat on WhatsApp to order.`;
  const url = `${SITE_URL}/products/${product.slug}`;
  const image = product.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MoGadget",
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return <ProductDetailWrapper product={product} />;
}
