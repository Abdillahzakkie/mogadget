import Link from "next/link";
import { CATEGORIES, CATEGORY_LABEL } from "@mogadget/contracts/constants";
import { getProducts } from "../../lib/publicApi";
import { ProductCard } from "../../components/ProductCard";
import { routes } from "../../constants/routes";

export default async function Home() {
  // Featured = newest-first (spec §12.3: admin "feature" toggle deferred for v1).
  const products = (await getProducts("sort=newest")).slice(0, 8);
  return (
    <>
      <section style={{ padding: "44px 0 20px" }}>
        <h1 style={hero}>New &amp; UK-used gadgets. Real photos, firm prices.</h1>
        <p style={sub}>
          Every pre-owned unit is graded, tested and photographed — what you see is the exact unit
          you get. Browse, then chat to order on WhatsApp.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
          <Link href={routes.catalog} style={primaryBtn}>
            Shop all gadgets
          </Link>
          <Link href={routes.contact} style={ghostBtn}>
            Visit the store
          </Link>
        </div>
      </section>

      <section style={{ padding: "8px 0 4px" }}>
        <div style={catRow}>
          {CATEGORIES.map((cat) => (
            <Link key={cat} href={`${routes.catalog}?category=${cat}`} style={catChip}>
              {CATEGORY_LABEL[cat]}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ padding: "24px 0 8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={{ font: "600 22px var(--font-display)", margin: 0 }}>Just in</h2>
          <Link href={routes.catalog} style={{ font: "500 14px var(--font-body)" }}>
            View all →
          </Link>
        </div>
        {products.length === 0 ? (
          <p style={{ color: "var(--sold)", marginTop: 16 }}>
            No products yet — run <code>yarn seed</code> and start the API on :4000.
          </p>
        ) : (
          <div style={grid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

const hero = {
  font: "600 44px/1.08 var(--font-display)",
  letterSpacing: "-.015em",
  margin: "0 0 14px",
  maxWidth: "18ch",
};
const sub = { color: "rgba(20,21,24,.65)", maxWidth: "52ch", fontSize: 16, lineHeight: 1.5 };
const primaryBtn = {
  background: "var(--brand)",
  color: "#fff",
  font: "600 15px var(--font-body)",
  padding: "12px 20px",
  borderRadius: 10,
};
const ghostBtn = {
  color: "var(--ink)",
  font: "600 15px var(--font-body)",
  padding: "12px 20px",
  borderRadius: 10,
  border: "1px solid rgba(20,21,24,.16)",
};
const catRow = { display: "flex", gap: 10, flexWrap: "wrap" as const, marginTop: 8 };
const catChip = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid rgba(20,21,24,.14)",
  color: "var(--ink)",
  font: "500 14px var(--font-body)",
  background: "#fff",
};
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 22,
  marginTop: 18,
};
