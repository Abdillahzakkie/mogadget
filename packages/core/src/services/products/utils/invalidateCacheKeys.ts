import { redisDeleteKeys } from "../../../databases/redis";
import { getQueryKey as bySlugKey } from "../getProductBySlug";
import { FACETS_KEY } from "../productFacets";

export default async function invalidateCacheKeys({ slug }: { slug?: string } = {}): Promise<void> {
  const keys = ["services:products:listProducts:*", FACETS_KEY];
  if (slug) keys.push(bySlugKey({ slug }));
  await redisDeleteKeys(...keys);
}
