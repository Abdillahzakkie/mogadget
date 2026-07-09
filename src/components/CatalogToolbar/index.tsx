"use client";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  CONDITION_LABEL,
  CONDITIONS,
} from "@/server/validators/constants";
import type { TStatus, TStockType } from "@/server/validators/types";
import type { IProductFilters, TProductSort } from "../../lib/productFilters";
import { Bar, Count, PriceInput, Reset, Search, Select } from "./styled";

const STATUS_OPTIONS: { value: TStatus; label: string }[] = [
  { value: "IN_STOCK", label: "In stock" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
  { value: "AVAILABLE", label: "Available" },
  { value: "SOLD", label: "Sold" },
];
const STOCK_OPTIONS: { value: TStockType; label: string }[] = [
  { value: "RESTOCKABLE", label: "Restockable" },
  { value: "UNIQUE_UNIT", label: "Unique unit" },
];
const SORT_OPTIONS: { value: TProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_desc", label: "Price ↓" },
  { value: "price_asc", label: "Price ↑" },
  { value: "clicks_desc", label: "Most clicks" },
  { value: "clicks_asc", label: "Fewest clicks" },
];

interface Props {
  filters: IProductFilters;
  setFilter: <K extends keyof IProductFilters>(key: K, value: IProductFilters[K]) => void;
  reset: () => void;
  count: number;
  total: number;
}

// Controlled filter bar. Owns no state — the parent lifts it via useProductFilters so the table
// (results) and this bar (controls) stay in sync. Filters scope the TABLE only (design decision).
export function CatalogToolbar({ filters, setFilter, reset, count, total }: Props) {
  const num = (v: string): number | null => (v.trim() === "" ? null : Math.max(0, Number(v) || 0));
  return (
    <Bar>
      <Search
        type="search"
        placeholder="Search name or brand…"
        aria-label="Search listings"
        value={filters.q}
        onChange={(e) => setFilter("q", e.target.value)}
      />
      <Select
        value={filters.category}
        aria-label="Category"
        onChange={(e) => setFilter("category", e.target.value as IProductFilters["category"])}
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABEL[c]}
          </option>
        ))}
      </Select>
      <Select
        value={filters.condition}
        aria-label="Condition"
        onChange={(e) => setFilter("condition", e.target.value as IProductFilters["condition"])}
      >
        <option value="">All conditions</option>
        {CONDITIONS.map((c) => (
          <option key={c} value={c}>
            {CONDITION_LABEL[c]}
          </option>
        ))}
      </Select>
      <Select
        value={filters.status}
        aria-label="Status"
        onChange={(e) => setFilter("status", e.target.value as IProductFilters["status"])}
      >
        <option value="">Any status</option>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select
        value={filters.stockType}
        aria-label="Stock type"
        onChange={(e) => setFilter("stockType", e.target.value as IProductFilters["stockType"])}
      >
        <option value="">Any stock type</option>
        {STOCK_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select
        value={filters.visibility}
        aria-label="Visibility"
        onChange={(e) => setFilter("visibility", e.target.value as IProductFilters["visibility"])}
      >
        <option value="">Any visibility</option>
        <option value="visible">Visible</option>
        <option value="hidden">Hidden</option>
      </Select>
      <PriceInput
        type="number"
        min={0}
        placeholder="Min ₦"
        aria-label="Minimum price"
        value={filters.min ?? ""}
        onChange={(e) => setFilter("min", num(e.target.value))}
      />
      <PriceInput
        type="number"
        min={0}
        placeholder="Max ₦"
        aria-label="Maximum price"
        value={filters.max ?? ""}
        onChange={(e) => setFilter("max", num(e.target.value))}
      />
      <Select
        value={filters.sort}
        aria-label="Sort"
        onChange={(e) => setFilter("sort", e.target.value as TProductSort)}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Reset type="button" onClick={reset}>
        Reset
      </Reset>
      <Count>
        {count} of {total} listings
      </Count>
    </Bar>
  );
}
