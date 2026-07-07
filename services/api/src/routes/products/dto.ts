import type { IProduct } from "@mogadget/core";
import type { IProductDto } from "@mogadget/contracts/types";

// NOTE: image `key` → public `url`. Until object storage (S3) is wired in M2, url = key passthrough.
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
      .map((i) => ({ url: i.key, sortOrder: i.sortOrder })),
    specs: p.specs,
    whatsappClickCount: p.whatsappClickCount,
    instagramClickCount: p.instagramClickCount,
    createdAt: new Date(p.createdAt).toISOString(),
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
}
