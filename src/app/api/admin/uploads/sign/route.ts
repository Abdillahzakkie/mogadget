export const runtime = "nodejs";

import { ok, requirePermission, signUpload, validateBody, withApiHandler } from "@/server";
import { Permission } from "@/server/validators/iam";
import { uploadSignSchema } from "@/server/validators/schemas";

export const POST = withApiHandler({ route: "/api/admin/uploads/sign" }, async (req) => {
  await requirePermission(Permission.ProductsWrite);
  const { contentType, ext } = await validateBody(req, uploadSignSchema);
  const guessed = ext || contentType.split("/")[1] || "jpg";
  return ok(await signUpload({ contentType, ext: guessed }));
});
