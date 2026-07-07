import {
  withApiHandler,
  ok,
  services,
  requirePermission,
  auditAdmin,
  validateBody,
  getProductByIdDB,
  ErrNotFound,
} from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";
import { updateProductSchema } from "@mogadget/contracts/schemas";
import { toPublicProduct } from "../../../products/dto";

interface ICtx {
  params: Promise<{ id: string }>;
}

export const GET = withApiHandler<ICtx>(
  { route: "/api/admin/products/[id]" },
  async (_req, ctx) => {
    await requirePermission(Permission.ProductsWrite);
    const doc = await getProductByIdDB({ id: (await ctx.params).id });
    if (!doc) throw ErrNotFound;
    return ok(toPublicProduct(doc));
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
        return ok(toPublicProduct(doc));
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
        const okDel = await services.products.deleteProduct({ id });
        if (!okDel) throw ErrNotFound;
        return ok({ deleted: true });
      },
      { action: "product.delete", targetType: "product" },
    )(req);
  },
);
