"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  CONDITION_LABEL,
  CONDITIONS,
} from "@/server/validators/constants";
import type { IFacets } from "../../lib/publicApi";
import {
  ApplyButton,
  CheckList,
  CheckRow,
  Chip,
  Chips,
  ClearButton,
  GroupHeading,
  GroupLabel,
  Input,
  Muted,
  PriceInput,
  PriceRow,
  Rail,
  SortSelect,
} from "./styled";

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
    <Rail>
      <form onSubmit={applyText}>
        <GroupLabel htmlFor="q">Search</GroupLabel>
        <Input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="iPhone, MacBook, PS5…"
        />

        <GroupHeading>Category</GroupHeading>
        <Chips>
          {CATEGORIES.map((cat) => {
            const count = facets.categories[cat] ?? 0;
            const on = activeCategory === cat;
            return (
              <Chip key={cat} type="button" onClick={() => setCategory(cat)} $on={on}>
                {CATEGORY_LABEL[cat]} {count ? <Muted>{count}</Muted> : null}
              </Chip>
            );
          })}
        </Chips>

        <GroupHeading>Condition</GroupHeading>
        <CheckList>
          {CONDITIONS.map((cond) => (
            <CheckRow key={cond}>
              <input
                type="checkbox"
                checked={activeConditions.includes(cond)}
                onChange={() => toggleCondition(cond)}
              />
              <span>
                {CONDITION_LABEL[cond]}{" "}
                {facets.conditions[cond] ? <Muted>{facets.conditions[cond]}</Muted> : null}
              </span>
            </CheckRow>
          ))}
        </CheckList>

        <GroupHeading>Price (₦)</GroupHeading>
        <PriceRow>
          <PriceInput
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
            placeholder="Min"
          />
          <PriceInput
            inputMode="numeric"
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
            placeholder="Max"
          />
        </PriceRow>

        <ApplyButton type="submit">Apply</ApplyButton>
      </form>

      <GroupHeading>Sort</GroupHeading>
      <SortSelect value={activeSort} onChange={(e) => setSort(e.target.value)}>
        <option value="newest">Newest first</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </SortSelect>

      {hasFilters && (
        <ClearButton type="button" onClick={clearAll}>
          Clear all filters
        </ClearButton>
      )}
    </Rail>
  );
}
