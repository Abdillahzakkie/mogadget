export const runtime = "nodejs";

import { ok, services, validateBody, withApiHandler, withRateLimit } from "@/server";
import { clickSchema } from "@/server/validators/schemas";

interface ICtx {
  params: Promise<{ slug: string }>;
}
export const POST = withApiHandler<ICtx>(
  { route: "/api/products/[slug]/click" },
  async (req, ctx) => {
    const { slug } = await ctx.params;
    return withRateLimit(
      async (r) => {
        const { channel } = await validateBody(r, clickSchema);
        await services.products.incrementClick({ slug, channel });
        return ok({ ok: true });
      },
      { scope: "click", max: 20, windowSeconds: 60 },
    )(req);
  },
);
