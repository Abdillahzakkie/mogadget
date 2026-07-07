import { getProductBySlugDB } from "../../models/products";
import type { IProduct } from "../../models/products/types";
import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases/redis";

const TTL = 5 * 60;
export function getQueryKey({ slug }: { slug: string }): string {
  return `services:products:getProductBySlug:${slug}`;
}
export default async function getProductBySlug({
  slug,
  refreshCache,
}: {
  slug: string;
  refreshCache?: boolean;
}): Promise<IProduct | null> {
  const key = getQueryKey({ slug });
  let result: IProduct | null = null;
  if (!refreshCache) result = (await redisRetrieveKeyString<IProduct>(key)) ?? null;
  if (!result) {
    result = await getProductBySlugDB({ slug });
    if (result) await redisUpdateKeyString(key, result, true, TTL);
  }
  return result;
}
