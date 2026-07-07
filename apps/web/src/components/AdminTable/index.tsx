"use client";
import Link from "next/link";
import { useState } from "react";
import type { IAdminProductDto, TStatus } from "@mogadget/contracts/types";
import { CONDITION_LABEL } from "@mogadget/contracts/constants";
import { useAdminProducts } from "../../hooks/products/useAdminProducts";
import { adminApi } from "../../lib/adminApi";
import { formatNaira } from "../../helpers/format";
import { routes } from "../../constants/routes";

// The two product state machines (must never offer an invalid transition):
//  RESTOCKABLE:  IN_STOCK ⇄ OUT_OF_STOCK
//  UNIQUE_UNIT:  AVAILABLE ⇄ SOLD
function nextStatus(p: IAdminProductDto): TStatus {
  if (p.stockType === "RESTOCKABLE") return p.status === "IN_STOCK" ? "OUT_OF_STOCK" : "IN_STOCK";
  return p.status === "AVAILABLE" ? "SOLD" : "AVAILABLE";
}

const STATUS_LABEL: Record<TStatus, string> = {
  IN_STOCK: "In stock",
  OUT_OF_STOCK: "Out of stock",
  AVAILABLE: "Available",
  SOLD: "Sold",
};

function isPositive(s: TStatus): boolean {
  return s === "IN_STOCK" || s === "AVAILABLE";
}

export function AdminTable() {
  const { products, isLoading, error, mutate } = useAdminProducts();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await fn();
      await mutate();
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <p style={{ color: "var(--sold)" }}>Loading…</p>;
  if (error) return <p style={{ color: "var(--danger)" }}>Failed to load products.</p>;
  if (products.length === 0) {
    return (
      <p style={{ color: "var(--sold)" }}>
        No products yet. <Link href={routes.adminNew}>Create your first listing →</Link>
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={table}>
        <thead>
          <tr>
            {["", "Name", "Condition", "Price", "Status", "Visible", "Clicks", ""].map((h, i) => (
              <th key={i} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const busy = busyId === p.id;
            const thumb = p.images[0]?.url;
            return (
              <tr key={p.id} style={{ opacity: busy ? 0.5 : 1 }}>
                <td style={td}>
                  <div style={{ ...thumbBox, backgroundImage: thumb ? `url(${thumb})` : undefined }} />
                </td>
                <td style={{ ...td, fontWeight: 600 }}>
                  {p.name}
                  <div style={{ font: "400 12px var(--font-body)", color: "var(--sold)" }}>
                    {p.brand}
                    {p.cosmeticGrade ? ` · Grade ${p.cosmeticGrade}` : ""}
                  </div>
                </td>
                <td style={td}>{CONDITION_LABEL[p.condition]}</td>
                <td style={{ ...td, fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums" }}>
                  {formatNaira(p.priceNaira)}
                </td>
                <td style={td}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(p.id, () => adminApi.setStatus(p.id, nextStatus(p)))}
                    title={`Set to ${STATUS_LABEL[nextStatus(p)]}`}
                    style={{
                      ...pill,
                      borderColor: isPositive(p.status) ? "var(--brand)" : "var(--sold)",
                      color: isPositive(p.status) ? "var(--brand)" : "var(--sold)",
                    }}
                  >
                    {STATUS_LABEL[p.status]}
                    {typeof p.quantity === "number" ? ` (${p.quantity})` : ""}
                  </button>
                </td>
                <td style={td}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(p.id, () => adminApi.setVisibility(p.id, !p.isVisible))}
                    style={{
                      ...pill,
                      borderColor: p.isVisible ? "var(--ink)" : "var(--sold)",
                      color: p.isVisible ? "var(--ink)" : "var(--sold)",
                    }}
                  >
                    {p.isVisible ? "Visible" : "Hidden"}
                  </button>
                </td>
                <td style={{ ...td, color: "var(--sold)", fontSize: 13 }}>
                  {p.whatsappClickCount}wa · {p.instagramClickCount}ig
                </td>
                <td style={td}>
                  <Link href={routes.adminEdit(p.id)} style={{ font: "600 13px var(--font-body)" }}>
                    Edit
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const table = { width: "100%", borderCollapse: "collapse" as const, background: "#fff" };
const th = {
  textAlign: "left" as const,
  font: "600 11px var(--font-body)",
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  color: "var(--sold)",
  padding: "10px 12px",
  borderBottom: "1px solid rgba(20,21,24,.10)",
};
const td = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(20,21,24,.06)",
  fontSize: 14,
  verticalAlign: "middle" as const,
};
const thumbBox = {
  width: 44,
  height: 44,
  borderRadius: 8,
  background: "#ECEAE3",
  backgroundSize: "cover",
  backgroundPosition: "center",
};
const pill = {
  padding: "4px 10px",
  borderRadius: 999,
  border: "1.5px solid",
  background: "transparent",
  font: "600 12px var(--font-body)",
  cursor: "pointer",
};
