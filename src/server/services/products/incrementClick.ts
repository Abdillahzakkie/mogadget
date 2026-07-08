import type { TClickChannel } from "@/server/validators/types";
import { redisDeleteKeys } from "../../databases/redis";
import { incrementClickDB } from "../../models/products";
import { getQueryKey as bySlugKey } from "./getProductBySlug";

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
