import { env } from "../constants/environments";
import { getLogger } from "./logger";

// Fire-and-forget on-demand ISR revalidation: pokes the Next web app's /revalidate
// webhook so its cached public pages refresh within seconds of an admin mutation.
// Layered on top of the Redis service cache (which is invalidated synchronously in
// the service layer). Never throws into the request path — failures are logged only.
export function triggerRevalidate(tags: string[]): void {
  if (!tags.length) return;
  const url = `${env.siteUrl.replace(/\/$/, "")}/revalidate`;
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: env.revalidateSecret, tags }),
  }).catch((err) => {
    getLogger().warn(`revalidate webhook failed: ${String(err)}`);
  });
}

// Tag helpers so producers (services/api) and consumers (apps/web fetches) agree on
// the exact tag strings without duplicating literals.
export const revalidateTags = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
};
