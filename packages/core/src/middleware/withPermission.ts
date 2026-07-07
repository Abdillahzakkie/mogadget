import type { TPermission } from "@mogadget/contracts/iam";
import { getSessionUser } from "../lib/requestContext";
import type { ISessionPayload } from "../lib/session";
import { fail, type IEnvelope } from "../lib/response";
import { ErrUnauthenticated, ErrUnauthorized } from "../constants/errors";
import resolveEffectivePermissions from "../services/iam/resolveEffectivePermissions";

export async function sessionHasPermissions(
  session: ISessionPayload,
  required: TPermission[],
): Promise<boolean> {
  const perms = new Set(await resolveEffectivePermissions({ userId: session.sub }));
  return required.every((r) => perms.has(r));
}
export async function requirePermission(...required: TPermission[]): Promise<ISessionPayload> {
  const session = getSessionUser();
  if (!session) throw ErrUnauthenticated;
  if (required.length && !(await sessionHasPermissions(session, required))) throw ErrUnauthorized;
  return session;
}
export function withPermission(
  handler: (req: Request) => Promise<IEnvelope>,
  ...required: TPermission[]
) {
  return async (req: Request): Promise<IEnvelope> => {
    const session = getSessionUser();
    if (!session) return fail(ErrUnauthenticated.code, ErrUnauthenticated.message);
    if (required.length && !(await sessionHasPermissions(session, required)))
      return fail(ErrUnauthorized.code, ErrUnauthorized.message);
    return handler(req);
  };
}
