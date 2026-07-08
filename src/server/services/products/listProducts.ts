import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases/redis";
import { listProductsDB } from "../../models/products";
import type { IProduct, IProductListFilter } from "../../models/products/types";

const TTL = 5 * 60;
const g = (v: unknown) => (v == null ? "*" : Array.isArray(v) ? v.join(",") : String(v));

export function getQueryKey(f: IProductListFilter): string {
  return `services:products:listProducts:${g(f.category)}:${g(f.q)}:${g(f.condition)}:${g(f.brand)}:${g(f.min)}:${g(f.max)}:${g(f.sort ?? "newest")}:${g(f.status ?? "public")}`;
}
export default async function listProducts(f: IProductListFilter = {}): Promise<IProduct[]> {
  const key = getQueryKey(f);
  const cached = await redisRetrieveKeyString<IProduct[]>(key);
  if (cached) return cached;
  const result = await listProductsDB(f);
  if (result.length > 0) await redisUpdateKeyString(key, result, true, TTL); // never cache empty
  return result;
}
