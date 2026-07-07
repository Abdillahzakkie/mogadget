import { withApiHandler, ok, services, ErrNotFound } from "@mogadget/core";
import { toPublicProduct } from "../dto";

interface ICtx {
  params: Promise<{ slug: string }>;
}
export const GET = withApiHandler<ICtx>({ route: "/api/products/[slug]" }, async (_req, ctx) => {
  const { slug } = await ctx.params;
  const product = await services.products.getProductBySlug({ slug });
  if (!product) throw ErrNotFound;
  return ok(toPublicProduct(product));
});
