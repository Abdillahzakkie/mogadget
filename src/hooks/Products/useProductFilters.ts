"use client";
import { useMemo, useState } from "react";
import type { IAdminProductDto } from "@/server/validators/types";
import {
  applyProductFilters,
  DEFAULT_FILTERS,
  type IProductFilters,
} from "../../lib/productFilters";

export function useProductFilters(products: IAdminProductDto[]) {
  const [filters, setFilters] = useState<IProductFilters>(DEFAULT_FILTERS);

  const setFilter = <K extends keyof IProductFilters>(key: K, value: IProductFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const reset = () => setFilters(DEFAULT_FILTERS);

  const filtered = useMemo(() => applyProductFilters(products, filters), [products, filters]);

  return { filters, setFilter, reset, filtered, total: products.length, count: filtered.length };
}
