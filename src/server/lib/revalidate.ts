import { getLogger } from "./logger";

// In-process on-demand ISR revalidation: product mutations invalidate the fetch-cache tags
// used by the public pages. Layered on top of the Redis service cache (which is invalidated
// synchronously in the service layer). Never throws into the request path — outside a Next
// request scope (unit tests, seed script) revalidateTag throws, which we swallow and log.
export function triggerRevalidate(tags: string[]): void {
  if (!tags.length) return;
  void import("next/cache")
    .then(({ revalidateTag }) => {
      // Next 16 signature: the "max" cache-life profile expires the tag immediately,
      // matching the legacy one-argument revalidateTag semantics.
      for (const tag of tags) revalidateTag(tag, "max");
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

// Path-based on-demand ISR revalidation. Site-config changes affect chrome that appears on every
// route (footer contact, WhatsApp links, maintenance gate), so we expire whole paths rather than
// a single fetch tag. `revalidatePath("/", "layout")` clears the root layout and everything nested
// under it. Same swallow-and-log contract as triggerRevalidate — never throws into the request.
export function triggerRevalidatePath(path: string, type: "page" | "layout" = "layout"): void {
  void import("next/cache")
    .then(({ revalidatePath }) => {
      revalidatePath(path, type);
    })
    .catch((err) => {
      getLogger().warn(`revalidatePath failed: ${String(err)}`);
    });
}

// Awaited variant: resolves only after the path is marked stale. Used where the caller must not
// report success until the public cache is guaranteed purged (e.g. a site-config save that flips
// maintenance mode — the admin expects it to take effect on the very next page load). Never throws
// into the request path; outside a Next request scope (unit tests/seed) it resolves quietly.
export async function revalidatePathNow(
  path: string,
  type: "page" | "layout" = "layout",
): Promise<void> {
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath(path, type);
  } catch (err) {
    getLogger().warn(`revalidatePath failed: ${String(err)}`);
  }
}
