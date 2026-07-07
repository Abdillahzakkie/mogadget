import type { IProductDto } from "@mogadget/contracts/types";
import { CONDITION_LABEL } from "@mogadget/contracts/constants";
import { formatNaira } from "../helpers/format";

async function getProducts(): Promise<IProductDto[]> {
  const origin = process.env.API_ORIGIN ?? "http://localhost:4000";
  try {
    const res = await fetch(`${origin}/api/products`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()).data as IProductDto[];
  } catch {
    return [];
  }
}

function ConditionBadge({ product }: { product: IProductDto }) {
  if (product.status === "SOLD") {
    return <span style={badgeSold}>{CONDITION_LABEL[product.condition].toUpperCase()} · SOLD</span>;
  }
  if (product.condition === "NEW") {
    return <span style={badgeNew}>BRAND NEW</span>;
  }
  const label = `${CONDITION_LABEL[product.condition]}${product.cosmeticGrade ? ` · ${product.cosmeticGrade}` : ""}`;
  return <span style={badgeUsed}>{label.toUpperCase()}</span>;
}

export default async function Home() {
  const products = await getProducts();
  return (
    <main>
      <div style={trustStrip}>
        1-Month Warranty on Everything · Physical Store in Computer Village, Ikeja · Nationwide
        Delivery · Free Delivery in Lagos
      </div>
      <div style={wrap}>
        <header style={{ padding: "18px 0", borderBottom: "1px solid rgba(20,21,24,.08)" }}>
          <div style={{ font: "700 24px var(--font-display)" }}>
            Mo<span style={{ color: "var(--brand)" }}>Gadget</span>
          </div>
        </header>
        <section style={{ padding: "40px 0 20px" }}>
          <h1 style={hero}>New &amp; UK-used gadgets. Real photos, firm prices.</h1>
          <p style={{ color: "rgba(20,21,24,.65)", maxWidth: "48ch", fontSize: 16 }}>
            Every pre-owned unit is graded, tested and photographed — what you see is the exact unit
            you get. Browse, then chat to order.
          </p>
        </section>
        <section style={{ paddingBottom: 48 }}>
          <div style={{ font: "600 22px var(--font-display)", margin: "0 0 16px" }}>Just in</div>
          {products.length === 0 ? (
            <p style={{ color: "var(--sold)" }}>
              No products yet — run <code>yarn seed</code> and start the API on :4000.
            </p>
          ) : (
            <div style={grid}>
              {products.map((p) => (
                <article key={p.id} style={{ opacity: p.status === "SOLD" ? 0.75 : 1 }}>
                  <div
                    style={{
                      aspectRatio: "4 / 3",
                      borderRadius: 12,
                      background: "#ECEAE3",
                      filter: p.status === "SOLD" ? "grayscale(.9)" : "none",
                    }}
                  />
                  <div style={{ fontSize: 14, margin: "8px 0 6px", color: "var(--ink)" }}>
                    {p.name}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <ConditionBadge product={p} />
                  </div>
                  <div
                    className="price"
                    style={{
                      fontWeight: 700,
                      fontSize: 17,
                      color: p.status === "SOLD" ? "var(--sold)" : "var(--ink)",
                      textDecoration: p.status === "SOLD" ? "line-through" : "none",
                    }}
                  >
                    {formatNaira(p.priceNaira)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const trustStrip = {
  background: "var(--brand)",
  color: "#fff",
  font: "500 12px var(--font-body)",
  padding: "8px 40px",
  textAlign: "center" as const,
};
const wrap = { maxWidth: 1240, margin: "0 auto", padding: "0 40px" };
const hero = {
  font: "600 44px/1.08 var(--font-display)",
  letterSpacing: "-.015em",
  margin: "0 0 14px",
  maxWidth: "18ch",
};
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 20,
};
const badgeBase = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  font: "600 10px var(--font-body)",
  letterSpacing: ".07em",
};
const badgeNew = { ...badgeBase, background: "var(--brand)", color: "#fff" };
const badgeUsed = {
  ...badgeBase,
  border: "1.5px solid var(--amber)",
  color: "var(--amber-text)",
};
const badgeSold = { ...badgeBase, border: "1.5px solid var(--sold)", color: "var(--sold)" };
