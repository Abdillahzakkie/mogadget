"use client";
import { useAdminProducts } from "../../hooks/Products/useAdminProducts";
import { StatCard, StatLabel, StatValue, Strip } from "./styled";

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
    <Strip>
      {cards.map((c) => (
        <StatCard key={c.label}>
          <StatValue className="price" $accent={c.accent}>
            {c.value}
          </StatValue>
          <StatLabel>{c.label}</StatLabel>
        </StatCard>
      ))}
    </Strip>
  );
}
