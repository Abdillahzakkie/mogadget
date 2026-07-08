import { getProductByIdDB, updateProductByIdDB } from "../../models/products";
import type { IProduct } from "../../models/products/types";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function setVisibility({
  id,
  isVisible,
}: {
  id: string;
  isVisible: boolean;
}): Promise<IProduct | null> {
  const existing = await getProductByIdDB({ id });
  if (!existing) return null;
  const doc = await updateProductByIdDB({ id, patch: { isVisible } });
  if (doc) await invalidateCacheKeys({ slug: doc.slug });
  return doc;
}
