import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONDITION_LABEL, GRADE_GLOSSARY } from "@mogadget/contracts/constants";
import { getProduct, getProducts } from "../../../../lib/publicApi";
import { formatNaira } from "../../../../helpers/format";
import { SITE_URL } from "../../../../constants/site";
import { routes } from "../../../../constants/routes";
import { ConditionBadge } from "../../../../components/ConditionBadge";
import { Gallery } from "../../../../components/Gallery";
import { WhatsAppButton, InstagramCta } from "../../../../components/ChatCta";

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

  const sold = product.status === "SOLD";
  const oos = product.status === "OUT_OF_STOCK";
  const gradeNote =
    product.condition !== "NEW" && product.cosmeticGrade
      ? GRADE_GLOSSARY[product.cosmeticGrade]
      : null;

  const ctaLabel = sold
    ? "Ask about a similar unit"
    : oos
      ? "Ask us to restock"
      : "Chat on WhatsApp to order";

  return (
    <>
      <nav style={crumbs}>
        <Link href={routes.home} style={crumbLink}>
          Home
        </Link>{" "}
        /{" "}
        <Link href={routes.catalog} style={crumbLink}>
          Shop
        </Link>{" "}
        / <span style={{ color: "var(--sold)" }}>{product.name}</span>
      </nav>

      <div className="product-detail">
        <Gallery images={product.images} name={product.name} sold={sold} />

        <div>
          <div style={{ marginBottom: 10 }}>
            <ConditionBadge
              condition={product.condition}
              cosmeticGrade={product.cosmeticGrade}
              status={product.status}
            />
          </div>
          <h1 style={{ font: "600 28px/1.15 var(--font-display)", margin: "0 0 12px" }}>
            {product.name}
          </h1>
          <div
            className="price"
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: sold ? "var(--sold)" : "var(--ink)",
              textDecoration: sold ? "line-through" : "none",
            }}
          >
            {formatNaira(product.priceNaira)}
          </div>

          {sold && <p style={statusNote}>This exact unit has been sold. Chat and we'll find you a similar one.</p>}
          {oos && <p style={statusNote}>Currently out of stock — message us and we'll let you know when it's back.</p>}
          {product.condition === "NEW" && product.status === "IN_STOCK" && typeof product.quantity === "number" && (
            <p style={{ ...statusNote, color: "var(--brand)" }}>
              In stock{product.quantity <= 3 ? ` — only ${product.quantity} left` : ""}
            </p>
          )}

          {product.description && (
            <p style={{ color: "rgba(20,21,24,.75)", lineHeight: 1.6, marginTop: 16 }}>
              {product.description}
            </p>
          )}

          {gradeNote && (
            <p style={gradeBox}>
              <strong>Grade {product.cosmeticGrade}:</strong> {gradeNote}
            </p>
          )}

          {product.specs.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={specTitle}>Specifications</div>
              <div className="spec-grid">
                {product.specs.map((s) => (
                  <div key={s.label} style={specCell}>
                    <div style={{ color: "var(--sold)", fontSize: 12 }}>{s.label}</div>
                    <div style={{ fontSize: 15 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <WhatsAppButton product={product} label={ctaLabel} />
            <InstagramCta product={product} />
            <p style={{ color: "var(--sold)", fontSize: 13, margin: 0 }}>
              1-month warranty · Free delivery in Lagos · Nationwide delivery
            </p>
          </div>
        </div>
      </div>

      {/* Sticky mobile buy bar — appears under 820px where the inline CTA scrolls away. */}
      <div className="sticky-wa">
        <WhatsAppButton product={product} label={ctaLabel} />
      </div>
    </>
  );
}

const crumbs = { padding: "18px 0 0", color: "var(--sold)", font: "400 13px var(--font-body)" };
const crumbLink = { color: "var(--sold)" };
const statusNote = { marginTop: 12, marginBottom: 0, font: "500 14px var(--font-body)", color: "var(--sold)" };
const gradeBox = {
  marginTop: 16,
  padding: "12px 14px",
  background: "rgba(217,142,4,.08)",
  border: "1px solid rgba(217,142,4,.25)",
  borderRadius: 10,
  color: "var(--amber-text)",
  fontSize: 14,
  lineHeight: 1.5,
};
const specTitle = {
  font: "600 12px var(--font-body)",
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  color: "rgba(20,21,24,.6)",
  marginBottom: 10,
};
const specCell = { background: "var(--paper)", padding: "12px 14px", display: "flex", flexDirection: "column" as const, gap: 4 };
