"use client";
import { useState } from "react";
import { CATEGORY_LABEL } from "@/server/validators/constants";
import type {
  IAdminProductDto,
  IClickTrends,
  ITrendPoint,
  TCategory,
  TStatus,
} from "@/server/validators/types";
import { useClickTrends } from "../../hooks/Analytics/useClickTrends";
import { useAdminProducts } from "../../hooks/Products/useAdminProducts";
import {
  BarRow,
  Card,
  CardHead,
  Chip,
  LeaderRow,
  Legend,
  Muted,
  RangeTabs,
  Section,
  SubHead,
} from "./styled";

const WA = "var(--whatsapp)";
const IG = "#c13584"; // Instagram magenta
const RANGES = [7, 30, 90];
const STATUS_LABEL: Record<TStatus, string> = {
  IN_STOCK: "In stock",
  OUT_OF_STOCK: "Out of stock",
  AVAILABLE: "Available",
  SOLD: "Sold",
};

// ---- Inline SVG trend chart (no chart lib). Responsive via viewBox. ----
function TrendChart({ trends }: { trends: IClickTrends }) {
  const W = 640;
  const H = 200;
  const P = 8;
  const pts = trends.series;
  const max = Math.max(1, ...pts.map((p) => Math.max(p.whatsapp, p.instagram)));
  const x = (i: number) => (pts.length <= 1 ? P : P + (i * (W - 2 * P)) / (pts.length - 1));
  const y = (v: number) => H - P - (v * (H - 2 * P)) / max;
  const line = (sel: (p: ITrendPoint) => number) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(sel(p)).toFixed(1)}`).join(" ");
  const area = (sel: (p: ITrendPoint) => number) =>
    `${line(sel)} L${x(pts.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="200"
      role="img"
      aria-label="Clicks over time"
    >
      <path d={area((p) => p.whatsapp)} fill={WA} opacity={0.12} />
      <path d={area((p) => p.instagram)} fill={IG} opacity={0.1} />
      <path d={line((p) => p.whatsapp)} fill="none" stroke={WA} strokeWidth={2} />
      <path d={line((p) => p.instagram)} fill="none" stroke={IG} strokeWidth={2} />
    </svg>
  );
}

function ClicksTrend() {
  const [days, setDays] = useState(30);
  const { trends, isLoading } = useClickTrends(days);
  const empty = trends && trends.totals.whatsapp === 0 && trends.totals.instagram === 0;

  return (
    <Card>
      <CardHead>
        <h3>Clicks over time</h3>
        <RangeTabs>
          {RANGES.map((r) => (
            <button key={r} type="button" data-active={r === days} onClick={() => setDays(r)}>
              {r}d
            </button>
          ))}
        </RangeTabs>
      </CardHead>
      {isLoading || !trends ? (
        <Muted>Loading trend…</Muted>
      ) : empty ? (
        <Muted>No clicks recorded in this window yet.</Muted>
      ) : (
        <>
          <TrendChart trends={trends} />
          <Legend>
            <span>
              <i style={{ background: WA }} /> WhatsApp ({trends.totals.whatsapp})
            </span>
            <span>
              <i style={{ background: IG }} /> Instagram ({trends.totals.instagram})
            </span>
          </Legend>
        </>
      )}
    </Card>
  );
}

function Bars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <>
      {rows.map(([label, n]) => (
        <BarRow key={label}>
          <span>{label}</span>
          <span className="track">
            <span className="fill" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="n">{n}</span>
        </BarRow>
      ))}
    </>
  );
}

function Breakdown({ products }: { products: IAdminProductDto[] }) {
  const byCat = new Map<TCategory, number>();
  const byStatus = new Map<TStatus, number>();
  for (const p of products) {
    byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1);
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
  }
  const catRows = [...byCat.entries()]
    .map(([k, n]) => [CATEGORY_LABEL[k], n] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  const statusRows = [...byStatus.entries()]
    .map(([k, n]) => [STATUS_LABEL[k], n] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  return (
    <Card>
      <CardHead>
        <h3>By category</h3>
      </CardHead>
      <Bars rows={catRows} />
      <SubHead>By status</SubHead>
      <Bars rows={statusRows} />
    </Card>
  );
}

function TopListings({ products }: { products: IAdminProductDto[] }) {
  const ranked = [...products]
    .map((p) => ({ p, clicks: p.whatsappClickCount + p.instagramClickCount }))
    .filter((r) => r.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);
  return (
    <Card>
      <CardHead>
        <h3>Top listings</h3>
      </CardHead>
      {ranked.length === 0 ? (
        <Muted>No clicks recorded yet.</Muted>
      ) : (
        ranked.map(({ p, clicks }) => (
          <LeaderRow key={p.id}>
            <span>{p.name}</span>
            <span className="clicks">{clicks} clicks</span>
          </LeaderRow>
        ))
      )}
    </Card>
  );
}

function Alerts({ products }: { products: IAdminProductDto[] }) {
  const THIRTY = 30 * 86_400_000;
  const stale = products.filter((p) => Date.now() - new Date(p.updatedAt).getTime() > THIRTY);
  const lowStock = products.filter(
    (p) => p.stockType === "RESTOCKABLE" && typeof p.quantity === "number" && p.quantity <= 3,
  );
  const visibleSold = products.filter((p) => p.isVisible && p.status === "SOLD");
  const none = !stale.length && !lowStock.length && !visibleSold.length;
  return (
    <Card>
      <CardHead>
        <h3>Attention</h3>
      </CardHead>
      {none ? (
        <Muted>Nothing needs attention. 🎉</Muted>
      ) : (
        <div>
          {visibleSold.map((p) => (
            <Chip key={`vs-${p.id}`} $tone="bad">
              Sold but visible: {p.name}
            </Chip>
          ))}
          {lowStock.map((p) => (
            <Chip key={`ls-${p.id}`} $tone="warn">
              Low stock: {p.name} ({p.quantity})
            </Chip>
          ))}
          {stale.map((p) => (
            <Chip key={`st-${p.id}`} $tone="info">
              Stale &gt;30d: {p.name}
            </Chip>
          ))}
        </div>
      )}
    </Card>
  );
}

// Catalog-wide analytics. Product-derived panels use the full admin list; the trend chart pulls
// from the timestamped click-event endpoint. All independent of the table's filters (by design).
export function AdminAnalytics() {
  const { products, isLoading } = useAdminProducts();
  if (isLoading || products.length === 0) return null;
  return (
    <>
      <Section>
        <ClicksTrend />
        <Breakdown products={products} />
      </Section>
      <Section>
        <TopListings products={products} />
        <Alerts products={products} />
      </Section>
    </>
  );
}
