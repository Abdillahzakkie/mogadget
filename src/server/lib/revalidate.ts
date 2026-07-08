import { getLogger } from "./logger";

// In-process on-demand ISR revalidation: product mutations invalidate the fetch-cache tags
// used by the public pages. Layered on top of the Redis service cache (which is invalidated
// synchronously in the service layer). Never throws into the request path — outside a Next
// request scope (unit tests, seed script) revalidateTag throws, which we swallow and log.
export function triggerRevalidate(tags: string[]): void {
  if (!tags.length) return;
  void import("next/cache")
    .then(({ revalidateTag }) => {
      for (const tag of tags) revalidateTag(tag);
    })
    .catch((err) => {
      getLogger().warn(`revalidateTag failed: ${String(err)}`);
    });
}

// Tag helpers so producers (admin mutations) and consumers (public page fetches) agree on
// the exact tag strings without duplicating literals.
export const revalidateTags = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
};
