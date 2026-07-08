import { type IProduct, resolveImageUrl } from "@/server";
import type { IAdminProductDto, IProductDto } from "@/server/validators/types";

// Image `key` → public `url` via the storage driver (local disk /uploads, or a presigned S3
// GET URL). Already-absolute keys (M1 seed data) pass through unchanged. Async because S3
// presigning is — resolveImageUrl returns a Promise, so images are resolved with Promise.all.
export async function toPublicProduct(p: IProduct): Promise<IProductDto> {
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
    images: await Promise.all(
      [...p.images]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(async (i) => ({ url: await resolveImageUrl(i.key), sortOrder: i.sortOrder })),
    ),
    specs: p.specs,
    whatsappClickCount: p.whatsappClickCount,
    instagramClickCount: p.instagramClickCount,
    createdAt: new Date(p.createdAt).toISOString(),
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
}

// Admin DTO = public DTO + visibility flag + image storage keys (so edit can round-trip images).
export async function toAdminProduct(p: IProduct): Promise<IAdminProductDto> {
  return {
    ...(await toPublicProduct(p)),
    isVisible: p.isVisible,
    images: await Promise.all(
      [...p.images]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(async (i) => ({ key: i.key, url: await resolveImageUrl(i.key), sortOrder: i.sortOrder })),
    ),
  };
}
