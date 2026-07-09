import type { TClickChannel } from "@/server/validators/types";
import { redisDeleteKeys } from "../../databases/redis";
import { getLogger } from "../../lib/logger";
import { insertClickEventDB } from "../../models/clickEvents";
import { incrementClickDB } from "../../models/products";
import { getQueryKey as bySlugKey } from "./getProductBySlug";

export default async function incrementClick({
  slug,
  channel,
}: {
  slug: string;
  channel: TClickChannel;
}): Promise<boolean> {
  const productId = await incrementClickDB({ slug, channel });
  if (!productId) return false;

  // Best-effort append for time-series analytics. A failure here MUST NOT fail the click
  // (never regress the WhatsApp/Instagram handoff) — the fast counter above already moved.
  try {
    await insertClickEventDB({ productId, slug, channel });
  } catch (err) {
    getLogger().warn({ err, slug, channel }, "click-event insert failed (click still recorded)");
  }

  await redisDeleteKeys(bySlugKey({ slug })); // refresh admin view; list cache untouched
  return true;
}
