import { deleteProductByIdDB, getProductByIdDB } from "../../models/products";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function deleteProduct({ id }: { id: string }): Promise<boolean> {
  const existing = await getProductByIdDB({ id });
  if (!existing) return false;
  const ok = await deleteProductByIdDB({ id });
  if (ok) await invalidateCacheKeys({ slug: existing.slug });
  return ok;
}
