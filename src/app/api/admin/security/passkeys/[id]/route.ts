export const runtime = "nodejs";

import {
  ErrInvalidFields,
  ErrNotFound,
  ErrUnauthenticated,
  getSessionUser,
  ok,
  services,
  withApiHandler,
} from "@/server";

interface ICtx {
  params: Promise<{ id: string }>;
}

// Rename a passkey the current admin owns. Body: { nickname: string }.
export const PATCH = withApiHandler<ICtx>(
  { route: "/api/admin/security/passkeys/[id]" },
  async (req, ctx) => {
    const session = getSessionUser();
    if (!session) throw ErrUnauthenticated;
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as { nickname?: unknown } | null;
    const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
    if (!nickname) throw ErrInvalidFields;
    const updated = await services.passkeys.renamePasskey({ id, userId: session.sub, nickname });
    if (!updated) throw ErrNotFound;
    return ok(updated);
  },
);

// Delete a passkey the current admin owns.
export const DELETE = withApiHandler<ICtx>(
  { route: "/api/admin/security/passkeys/[id]" },
  async (_req, ctx) => {
    const session = getSessionUser();
    if (!session) throw ErrUnauthenticated;
    const { id } = await ctx.params;
    const deleted = await services.passkeys.deletePasskey({ id, userId: session.sub });
    if (!deleted) throw ErrNotFound;
    return ok({ deleted: true });
  },
);
