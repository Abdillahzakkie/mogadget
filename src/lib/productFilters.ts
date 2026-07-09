import type {
  IAdminProductDto,
  TCategory,
  TCondition,
  TStatus,
  TStockType,
} from "@/server/validators/types";

export type TProductSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "clicks_desc"
  | "clicks_asc";

export interface IProductFilters {
  q: string;
  category: TCategory | "";
  condition: TCondition | "";
  status: TStatus | "";
  stockType: TStockType | "";
  visibility: "" | "visible" | "hidden";
  min: number | null;
  max: number | null;
  sort: TProductSort;
}

export const DEFAULT_FILTERS: IProductFilters = {
  q: "",
  category: "",
  condition: "",
  status: "",
  stockType: "",
  visibility: "",
  min: null,
  max: null,
  sort: "newest",
};

const totalClicks = (p: IAdminProductDto): number => p.whatsappClickCount + p.instagramClickCount;

export function matchesFilters(p: IAdminProductDto, f: IProductFilters): boolean {
  const q = f.q.trim().toLowerCase();
  if (q && !`${p.name} ${p.brand}`.toLowerCase().includes(q)) return false;
  if (f.category && p.category !== f.category) return false;
  if (f.condition && p.condition !== f.condition) return false;
  if (f.status && p.status !== f.status) return false;
  if (f.stockType && p.stockType !== f.stockType) return false;
  if (f.visibility === "visible" && !p.isVisible) return false;
  if (f.visibility === "hidden" && p.isVisible) return false;
  if (f.min != null && p.priceNaira < f.min) return false;
  if (f.max != null && p.priceNaira > f.max) return false;
  return true;
}

const SORTERS: Record<TProductSort, (a: IAdminProductDto, b: IAdminProductDto) => number> = {
  newest: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  price_asc: (a, b) => a.priceNaira - b.priceNaira,
  price_desc: (a, b) => b.priceNaira - a.priceNaira,
  clicks_desc: (a, b) => totalClicks(b) - totalClicks(a),
  clicks_asc: (a, b) => totalClicks(a) - totalClicks(b),
};

export function applyProductFilters(
  products: IAdminProductDto[],
  f: IProductFilters,
): IAdminProductDto[] {
  return products.filter((p) => matchesFilters(p, f)).sort(SORTERS[f.sort]);
}
