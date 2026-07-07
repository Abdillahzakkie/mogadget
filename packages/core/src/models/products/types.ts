import type {
  TCategory,
  TClickChannel,
  TCondition,
  TCosmeticGrade,
  TStatus,
  TStockType,
} from "@mogadget/contracts/types";

export interface IProductImage {
  key: string;
  sortOrder: number;
}
export interface IProductSpec {
  label: string;
  value: string;
}
export interface IProduct {
  _id: string;
  slug: string;
  name: string;
  category: TCategory;
  brand: string;
  condition: TCondition;
  cosmeticGrade: TCosmeticGrade | null;
  priceNaira: number;
  description: string | null;
  stockType: TStockType;
  status: TStatus;
  quantity: number | null;
  isVisible: boolean;
  images: IProductImage[];
  specs: IProductSpec[];
  whatsappClickCount: number;
  instagramClickCount: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface IProductCreateInput {
  slug: string;
  name: string;
  category: TCategory;
  brand: string;
  condition: TCondition;
  cosmeticGrade: TCosmeticGrade | null;
  priceNaira: number;
  description?: string | null;
  stockType: TStockType;
  status: TStatus;
  quantity?: number | null;
  isVisible?: boolean;
  images?: IProductImage[];
  specs?: IProductSpec[];
}
export type IProductUpdateInput = Partial<Omit<IProductCreateInput, "slug">>;
export interface IProductListFilter {
  category?: TCategory;
  q?: string;
  condition?: TCondition[];
  brand?: string[];
  min?: number;
  max?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  includeHidden?: boolean;
  status?: "public" | "all";
  limit?: number;
}
export type { TClickChannel };
