import {
  withApiHandler,
  ok,
  services,
  requirePermission,
  auditAdmin,
  validateBody,
  getProductByIdDB,
  ErrNotFound,
  triggerRevalidate,
  revalidateTags,
} from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";
import { updateProductSchema } from "@mogadget/contracts/schemas";
import { toAdminProduct } from "../../../products/dto";

interface ICtx {
  params: Promise<{ id: string }>;
}

export const GET = withApiHandler<ICtx>(
  { route: "/api/admin/products/[id]" },
  async (_req, ctx) => {
    await requirePermission(Permission.ProductsWrite);
    const doc = await getProductByIdDB({ id: (await ctx.params).id });
    if (!doc) throw ErrNotFound;
    return ok(toAdminProduct(doc));
  },
);

export const PATCH = withApiHandler<ICtx>(
  { route: "/api/admin/products/[id]" },
  async (req, ctx) => {
    const { id } = await ctx.params;
    return auditAdmin(
      async (r) => {
        await requirePermission(Permission.ProductsWrite);
        const patch = await validateBody(r, updateProductSchema, { patch: true });
        const doc = await services.products.updateProduct({ id, patch });
        if (!doc) throw ErrNotFound;
        triggerRevalidate([revalidateTags.products, revalidateTags.product(doc.slug)]);
        return ok(toAdminProduct(doc));
      },
      { action: "product.update", targetType: "product", captureBody: true },
    )(req);
  },
);

export const DELETE = withApiHandler<ICtx>(
  { route: "/api/admin/products/[id]" },
  async (req, ctx) => {
    const { id } = await ctx.params;
    return auditAdmin(
      async () => {
        await requirePermission(Permission.ProductsWrite);
        const existing = await getProductByIdDB({ id });
        const okDel = await services.products.deleteProduct({ id });
        if (!okDel) throw ErrNotFound;
        triggerRevalidate([
          revalidateTags.products,
          ...(existing ? [revalidateTags.product(existing.slug)] : []),
        ]);
        return ok({ deleted: true });
      },
      { action: "product.delete", targetType: "product" },
    )(req);
  },
);
