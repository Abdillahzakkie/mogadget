import { withApiHandler, ok, requirePermission, validateBody, signUpload } from "@mogadget/core";
import { Permission } from "@mogadget/contracts/iam";
import { uploadSignSchema } from "@mogadget/contracts/schemas";

export const POST = withApiHandler({ route: "/api/admin/uploads/sign" }, async (req) => {
  await requirePermission(Permission.ProductsWrite);
  const { contentType, ext } = await validateBody(req, uploadSignSchema);
  const guessed = ext || contentType.split("/")[1] || "jpg";
  return ok(await signUpload({ contentType, ext: guessed }));
});
