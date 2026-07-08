import type { TStatus } from "@/server/validators/types";
import { assertProductInvariants } from "../../domain";
import { getProductByIdDB, updateProductByIdDB } from "../../models/products";
import type { IProduct } from "../../models/products/types";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function setStatus({
  id,
  status,
}: {
  id: string;
  status: TStatus;
}): Promise<IProduct | null> {
  const existing = await getProductByIdDB({ id });
  if (!existing) return null;
  assertProductInvariants({ ...existing, status });
  const doc = await updateProductByIdDB({ id, patch: { status } });
  if (doc) await invalidateCacheKeys({ slug: doc.slug });
  return doc;
}
