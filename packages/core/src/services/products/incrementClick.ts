import { incrementClickDB } from "../../models/products";
import type { TClickChannel } from "@mogadget/contracts/types";
import { getQueryKey as bySlugKey } from "./getProductBySlug";
import { redisDeleteKeys } from "../../databases/redis";

export default async function incrementClick({
  slug,
  channel,
}: {
  slug: string;
  channel: TClickChannel;
}): Promise<boolean> {
  const ok = await incrementClickDB({ slug, channel });
  if (ok) await redisDeleteKeys(bySlugKey({ slug })); // refresh admin view; list cache untouched
  return ok;
}
