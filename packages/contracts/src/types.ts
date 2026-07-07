export interface IResponseData<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

export type TCategory = "PHONES" | "LAPTOPS" | "AUDIO" | "WEARABLES" | "CONSOLES" | "OTHER";
export type TCondition = "NEW" | "UK_USED" | "US_USED" | "NG_USED";
export type TCosmeticGrade = "A" | "B" | "C";
export type TStatus = "IN_STOCK" | "OUT_OF_STOCK" | "AVAILABLE" | "SOLD";
export type TStockType = "RESTOCKABLE" | "UNIQUE_UNIT";
export type TClickChannel = "whatsapp" | "instagram";

export interface IProductImageDto {
  url: string;
  sortOrder: number;
}
export interface IProductSpecDto {
  label: string;
  value: string;
}
export interface IProductDto {
  id: string;
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
  images: IProductImageDto[];
  specs: IProductSpecDto[];
  whatsappClickCount: number;
  instagramClickCount: number;
  createdAt: string;
  updatedAt: string;
}

// Admin surfaces additionally expose the visibility flag (hidden products only appear in admin).
export interface IAdminProductDto extends IProductDto {
  isVisible: boolean;
}
