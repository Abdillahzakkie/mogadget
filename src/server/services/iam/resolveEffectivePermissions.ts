import {
  compileStatements,
  type IPolicyStatement,
  type TPermission,
} from "@/server/validators/iam";
import {
  redisDeleteKeys,
  redisRetrieveKeyString,
  redisUpdateKeyString,
} from "../../databases/redis";
import { listGroupsByIdsDB } from "../../models/groups";
import { listPoliciesByIdsDB } from "../../models/policies";
import { getUserByIdDB } from "../../models/users";

const TTL = 30;
const key = (userId: string) => `services:iam:resolveEffectivePermissions:${userId}`;

export default async function resolveEffectivePermissions({
  userId,
  refreshCache,
}: {
  userId: string;
  refreshCache?: boolean;
}): Promise<TPermission[]> {
  if (!refreshCache) {
    const c = await redisRetrieveKeyString<TPermission[]>(key(userId));
    if (c) return c;
  }
  const user = await getUserByIdDB({ id: userId });
  if (!user) return [];
  const groups = await listGroupsByIdsDB({ ids: user.groupIds.map(String) });
  const groupPolicyIds = groups.flatMap((grp) => grp.policyIds.map(String));
  const policies = await listPoliciesByIdsDB({
    ids: [...user.attachedPolicyIds.map(String), ...groupPolicyIds],
  });
  const statements: IPolicyStatement[] = [
    ...policies.flatMap((p) => p.statements),
    ...groups.flatMap((grp) => grp.statements),
  ];
  const perms = compileStatements(statements);
  await redisUpdateKeyString(key(userId), perms, true, TTL);
  return perms;
}
export async function invalidateEffectivePermissions({
  userId,
}: {
  userId: string;
}): Promise<void> {
  await redisDeleteKeys(key(userId));
}
