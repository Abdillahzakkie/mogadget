import { listUsersDB } from "../../models/users";
import { Permission } from "../../validators/iam";
import resolveEffectivePermissions, {
  invalidateEffectivePermissions,
} from "./resolveEffectivePermissions";

// Users whose effective permissions include iam:manage — i.e. administrators. Used by the
// self-lockout / last-admin guards. The user set is tiny (single-owner shop), so resolving each
// one is cheap.
export async function listAdminUserIds(): Promise<string[]> {
  const users = await listUsersDB();
  const resolved = await Promise.all(
    users.map(async (u) => ({
      id: String(u._id),
      perms: await resolveEffectivePermissions({ userId: String(u._id), refreshCache: true }),
    })),
  );
  return resolved.filter((r) => r.perms.includes(Permission.IamManage)).map((r) => r.id);
}

// Group/policy edits change access for potentially every user, so blow away the whole effective-
// permissions cache. Cheap at this scale.
export async function invalidateAllEffectivePermissions(): Promise<void> {
  const users = await listUsersDB();
  await Promise.all(users.map((u) => invalidateEffectivePermissions({ userId: String(u._id) })));
}
