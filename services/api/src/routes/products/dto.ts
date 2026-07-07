import { resolveImageUrl, type IProduct } from "@mogadget/core";
import type { IProductDto } from "@mogadget/contracts/types";

// Image `key` → public `url` via the storage driver (local disk /uploads or S3 CDN).
// Already-absolute keys (M1 seed data) pass through unchanged.
export function toPublicProduct(p: IProduct): IProductDto {
  return {
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    category: p.category,
    brand: p.brand,
    condition: p.condition,
    cosmeticGrade: p.cosmeticGrade,
    priceNaira: p.priceNaira,
    description: p.description,
    stockType: p.stockType,
    status: p.status,
    quantity: p.quantity,
    images: [...p.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({ url: resolveImageUrl(i.key), sortOrder: i.sortOrder })),
    specs: p.specs,
    whatsappClickCount: p.whatsappClickCount,
    instagramClickCount: p.instagramClickCount,
    createdAt: new Date(p.createdAt).toISOString(),
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
}
