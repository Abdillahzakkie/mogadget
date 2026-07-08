"use client";
import type { CSSProperties } from "react";
import { useAdminProducts } from "../../hooks/products/useAdminProducts";

// Catalog-wide analytics summary (spec M4): totals across all listings, derived from the
// same admin product list the table renders (no extra endpoint).
export function AdminStats() {
  const { products, isLoading } = useAdminProducts();
  if (isLoading || products.length === 0) return null;

  const live = products.filter(
    (p) => p.isVisible && p.status !== "SOLD" && p.status !== "OUT_OF_STOCK",
  );
  const sold = products.filter((p) => p.status === "SOLD");
  const wa = products.reduce((n, p) => n + p.whatsappClickCount, 0);
  const ig = products.reduce((n, p) => n + p.instagramClickCount, 0);

  const cards: { label: string; value: string; accent?: string }[] = [
    { label: "Listings", value: String(products.length) },
    { label: "Live", value: String(live.length), accent: "var(--brand)" },
    { label: "Sold", value: String(sold.length), accent: "var(--sold)" },
    { label: "WhatsApp clicks", value: String(wa), accent: "var(--whatsapp)" },
    { label: "Instagram clicks", value: String(ig) },
  ];

  return (
    <div style={strip}>
      {cards.map((c) => (
        <div key={c.label} style={card}>
          <div
            className="price"
            style={{ fontSize: 24, fontWeight: 700, color: c.accent ?? "var(--ink)" }}
          >
            {c.value}
          </div>
          <div style={{ color: "var(--sold)", font: "500 12px var(--font-body)" }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

const strip: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 12,
  marginBottom: 20,
};
const card: CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(20,21,24,.1)",
  borderRadius: 12,
  padding: "14px 16px",
};
