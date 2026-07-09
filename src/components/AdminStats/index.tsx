"use client";
import { formatNaira } from "../../helpers/format";
import { useAdminProducts } from "../../hooks/Products/useAdminProducts";
import { StatCard, StatLabel, StatValue, Strip } from "./styled";

// Listings with RESTOCKABLE quantity at/under this are surfaced as "Low stock".
const LOW_STOCK_THRESHOLD = 3;

// Catalog-wide analytics summary: totals across ALL listings, derived from the admin product
// list (no extra endpoint). Stays catalog-wide even when the table is filtered (design decision).
export function AdminStats() {
  const { products, isLoading } = useAdminProducts();
  if (isLoading || products.length === 0) return null;

  const live = products.filter(
    (p) => p.isVisible && p.status !== "SOLD" && p.status !== "OUT_OF_STOCK",
  );
  const sold = products.filter((p) => p.status === "SOLD");
  const wa = products.reduce((n, p) => n + p.whatsappClickCount, 0);
  const ig = products.reduce((n, p) => n + p.instagramClickCount, 0);

  // Inventory value = Σ priceNaira × quantity over stock that is not SOLD. UNIQUE_UNIT items
  // have quantity null → treated as 1 unit unless SOLD (then 0).
  const inventoryValue = products.reduce((sum, p) => {
    if (p.status === "SOLD") return sum;
    const qty = typeof p.quantity === "number" ? p.quantity : 1;
    return sum + p.priceNaira * qty;
  }, 0);

  const lowStock = products.filter(
    (p) =>
      p.stockType === "RESTOCKABLE" &&
      typeof p.quantity === "number" &&
      p.quantity <= LOW_STOCK_THRESHOLD,
  );
  const hidden = products.filter((p) => !p.isVisible);

  const cards: { label: string; value: string; accent?: string }[] = [
    { label: "Listings", value: String(products.length) },
    { label: "Live", value: String(live.length), accent: "var(--brand)" },
    { label: "Sold", value: String(sold.length), accent: "var(--sold)" },
    { label: "Inventory value", value: formatNaira(inventoryValue) },
    {
      label: "Low stock",
      value: String(lowStock.length),
      accent: lowStock.length ? "var(--sold)" : undefined,
    },
    { label: "Hidden", value: String(hidden.length) },
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
