import type { TCreateProductInput } from "@/server/validators/schemas";
import { assertProductInvariants, generateSlug, stockAwareVisibility } from "../../domain";
import { createProductDB } from "../../models/products";
import type { IProduct } from "../../models/products/types";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function createProduct(input: TCreateProductInput): Promise<IProduct | null> {
  assertProductInvariants({
    condition: input.condition,
    cosmeticGrade: input.cosmeticGrade ?? null,
    stockType: input.stockType,
    status: input.status,
    quantity: input.quantity ?? null,
    priceNaira: input.priceNaira,
  });
  const slug = generateSlug(input.name);
  const doc = await createProductDB({
    ...input,
    slug,
    cosmeticGrade: input.cosmeticGrade ?? null,
    description: input.description ?? null,
    quantity: input.quantity ?? null,
    // Zero-stock restockable listing is created hidden, regardless of the submitted flag.
    isVisible: stockAwareVisibility({
      stockType: input.stockType,
      quantity: input.quantity ?? null,
      isVisible: input.isVisible,
    }),
  });
  if (doc) await invalidateCacheKeys({ slug });
  return doc;
}
