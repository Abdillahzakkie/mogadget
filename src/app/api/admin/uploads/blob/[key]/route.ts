export const runtime = "nodejs";

import { ErrInvalidFields, ok, requirePermission, withApiHandler, writeLocalBlob } from "@/server";
import { Permission } from "@/server/validators/iam";

interface ICtx {
  params: Promise<{ key: string }>;
}

// Local storage-driver upload target. The browser PUTs raw image bytes here to the exact
// `uploadUrl` returned by /api/admin/uploads/sign; `key` is the filename segment, which we
// re-namespace under products/ to match the key signUpload minted.
export const PUT = withApiHandler<ICtx>(
  { route: "/api/admin/uploads/blob/[key]" },
  async (req, ctx) => {
    await requirePermission(Permission.ProductsWrite);
    const { key } = await ctx.params;
    const fullKey = `products/${key}`;
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.byteLength === 0) throw ErrInvalidFields;
    await writeLocalBlob(fullKey, buf);
    return ok({ key: fullKey });
  },
);
