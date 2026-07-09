import { assertProductInvariants, stockAwareVisibility } from "../../domain";
import { getProductByIdDB, updateProductByIdDB } from "../../models/products";
import type { IProduct, IProductUpdateInput } from "../../models/products/types";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

const ALLOWED_KEYS: (keyof IProductUpdateInput)[] = [
  "name",
  "category",
  "brand",
  "condition",
  "cosmeticGrade",
  "priceNaira",
  "description",
  "stockType",
  "status",
  "quantity",
  "isVisible",
  "images",
  "specs",
];

export default async function updateProduct({
  id,
  patch,
}: {
  id: string;
  patch: IProductUpdateInput;
}): Promise<IProduct | null> {
  const existing = await getProductByIdDB({ id });
  if (!existing) return null;
  const clean: IProductUpdateInput = {};
  for (const k of ALLOWED_KEYS) {
    if (k in patch) (clean as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];
  }
  const merged = { ...existing, ...clean };
  assertProductInvariants({
    condition: merged.condition,
    cosmeticGrade: merged.cosmeticGrade,
    stockType: merged.stockType,
    status: merged.status,
    quantity: merged.quantity,
    priceNaira: merged.priceNaira,
  });
  // Auto-hide when this write drops a restockable listing to zero stock — persisted even if the
  // admin left visibility untouched (or tried to keep it visible). See stockAwareVisibility.
  const enforcedVisible = stockAwareVisibility({
    stockType: merged.stockType,
    quantity: merged.quantity,
    isVisible: merged.isVisible,
  });
  if (enforcedVisible !== merged.isVisible) clean.isVisible = enforcedVisible;
  const doc = await updateProductByIdDB({ id, patch: clean });
  if (doc) await invalidateCacheKeys({ slug: doc.slug });
  return doc;
}
