import { createProductDB } from "../../models/products";
import type { IProduct } from "../../models/products/types";
import type { TCreateProductInput } from "@mogadget/contracts/schemas";
import { assertProductInvariants, generateSlug } from "../../domain";
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
  });
  if (doc) await invalidateCacheKeys({ slug });
  return doc;
}
