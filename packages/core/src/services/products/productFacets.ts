import { productFacetsDB } from "../../models/products";
import { redisRetrieveKeyString, redisUpdateKeyString } from "../../databases/redis";

export const FACETS_KEY = "services:products:productFacets";
const TTL = 5 * 60;

export default async function productFacets() {
  const cached =
    await redisRetrieveKeyString<Awaited<ReturnType<typeof productFacetsDB>>>(FACETS_KEY);
  if (cached) return cached;
  const result = await productFacetsDB();
  await redisUpdateKeyString(FACETS_KEY, result, true, TTL);
  return result;
}
