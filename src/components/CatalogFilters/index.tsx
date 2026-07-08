"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, FormEvent } from "react";
import { useCallback, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  CONDITION_LABEL,
  CONDITIONS,
} from "@/server/validators/constants";
import type { IFacets } from "../../lib/publicApi";

// Catalog filter rail (spec §9, screen 1b/1f). All state lives in the URL query string so
// filtered views are shareable and server-rendered; this component only reads current
// params and pushes updated ones.
export function CatalogFilters({ facets }: { facets: IFacets }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");

  const activeCategory = params.get("category");
  const activeConditions = params.getAll("condition");
  const activeSort = params.get("sort") ?? "newest";

  const push = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [params, pathname, router],
  );

  const setCategory = (cat: string) =>
    push((p) => (activeCategory === cat ? p.delete("category") : p.set("category", cat)));

  const toggleCondition = (cond: string) =>
    push((p) => {
      const current = p.getAll("condition");
      p.delete("condition");
      const next = current.includes(cond) ? current.filter((c) => c !== cond) : [...current, cond];
      next.forEach((c) => p.append("condition", c));
    });

  const setSort = (sort: string) => push((p) => p.set("sort", sort));

  const applyText = (e: FormEvent) => {
    e.preventDefault();
    push((p) => {
      q ? p.set("q", q) : p.delete("q");
      min ? p.set("min", min) : p.delete("min");
      max ? p.set("max", max) : p.delete("max");
    });
  };

  const clearAll = () => {
    setQ("");
    setMin("");
    setMax("");
    router.push(pathname);
  };

  const hasFilters =
    !!activeCategory ||
    activeConditions.length > 0 ||
    !!params.get("q") ||
    !!params.get("min") ||
    !!params.get("max");

  return (
    <aside style={rail}>
      <form onSubmit={applyText}>
        <label style={groupLabel} htmlFor="q">
          Search
        </label>
        <input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="iPhone, MacBook, PS5…"
          style={input}
        />

        <div style={{ ...groupLabel, marginTop: 20 }}>Category</div>
        <div style={chips}>
          {CATEGORIES.map((cat) => {
            const count = facets.categories[cat] ?? 0;
            const on = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={{ ...chip, ...(on ? chipOn : null) }}
              >
                {CATEGORY_LABEL[cat]} {count ? <span style={muted}>{count}</span> : null}
              </button>
            );
          })}
        </div>

        <div style={{ ...groupLabel, marginTop: 20 }}>Condition</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CONDITIONS.map((cond) => (
            <label key={cond} style={checkRow}>
              <input
                type="checkbox"
                checked={activeConditions.includes(cond)}
                onChange={() => toggleCondition(cond)}
              />
              <span>
                {CONDITION_LABEL[cond]}{" "}
                {facets.conditions[cond] ? (
                  <span style={muted}>{facets.conditions[cond]}</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>

        <div style={{ ...groupLabel, marginTop: 20 }}>Price (₦)</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
            placeholder="Min"
            style={{ ...input, width: "50%" }}
          />
          <input
            inputMode="numeric"
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
            placeholder="Max"
            style={{ ...input, width: "50%" }}
          />
        </div>

        <button type="submit" style={applyBtn}>
          Apply
        </button>
      </form>

      <div style={{ ...groupLabel, marginTop: 20 }}>Sort</div>
      <select value={activeSort} onChange={(e) => setSort(e.target.value)} style={input}>
        <option value="newest">Newest first</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </select>

      {hasFilters && (
        <button type="button" onClick={clearAll} style={clearBtn}>
          Clear all filters
        </button>
      )}
    </aside>
  );
}

const rail: CSSProperties = { display: "flex", flexDirection: "column" };
const groupLabel: CSSProperties = {
  font: "600 12px var(--font-body)",
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "rgba(20,21,24,.6)",
  marginBottom: 10,
  display: "block",
};
const input: CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 9,
  border: "1px solid rgba(20,21,24,.16)",
  font: "400 15px var(--font-body)",
  background: "#fff",
};
const chips: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const chip: CSSProperties = {
  padding: "6px 11px",
  borderRadius: 999,
  border: "1px solid rgba(20,21,24,.16)",
  background: "#fff",
  font: "500 13px var(--font-body)",
  cursor: "pointer",
  color: "var(--ink)",
};
const chipOn: CSSProperties = {
  background: "var(--brand)",
  color: "#fff",
  borderColor: "var(--brand)",
};
const checkRow: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  font: "400 15px var(--font-body)",
  cursor: "pointer",
};
const muted: CSSProperties = { color: "var(--sold)", fontSize: 12 };
const applyBtn: CSSProperties = {
  marginTop: 16,
  width: "100%",
  padding: "10px",
  borderRadius: 9,
  border: "none",
  background: "var(--ink)",
  color: "#fff",
  font: "600 14px var(--font-body)",
  cursor: "pointer",
};
const clearBtn: CSSProperties = {
  marginTop: 16,
  background: "none",
  border: "none",
  color: "var(--danger)",
  font: "500 14px var(--font-body)",
  cursor: "pointer",
  textAlign: "left",
  padding: 0,
};
