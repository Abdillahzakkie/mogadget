import {
  createGroupDB,
  deleteGroupDB,
  getGroupByIdDB,
  getGroupByNameDB,
  listGroupsDB,
  updateGroupDB,
} from "../../models/groups";
import type { IGroup } from "../../models/groups/types";
import { type IPolicyStatement, isValidPolicyStatement } from "../../validators/iam";
import { invalidateAllEffectivePermissions } from "./guards";

export async function listGroups(): Promise<IGroup[]> {
  return listGroupsDB();
}

export type GroupResult =
  | { ok: true; group: IGroup }
  | { ok: false; reason: "taken" | "not_found" | "managed" | "invalid" | "failed" };

function statementsValid(statements: IPolicyStatement[]): boolean {
  return statements.every(isValidPolicyStatement);
}

export async function createGroup(input: {
  name: string;
  policyIds: string[];
  statements: IPolicyStatement[];
}): Promise<GroupResult> {
  if (!statementsValid(input.statements)) return { ok: false, reason: "invalid" };
  if (await getGroupByNameDB({ name: input.name })) return { ok: false, reason: "taken" };
  const group = await createGroupDB(input);
  if (!group) return { ok: false, reason: "failed" };
  await invalidateAllEffectivePermissions();
  return { ok: true, group };
}

export async function updateGroup(input: {
  id: string;
  patch: { name?: string; policyIds?: string[]; statements?: IPolicyStatement[] };
}): Promise<GroupResult> {
  const existing = await getGroupByIdDB({ id: input.id });
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.managed) return { ok: false, reason: "managed" };
  if (input.patch.statements && !statementsValid(input.patch.statements)) {
    return { ok: false, reason: "invalid" };
  }
  const group = await updateGroupDB({ id: input.id, patch: input.patch });
  if (!group) return { ok: false, reason: "failed" };
  await invalidateAllEffectivePermissions();
  return { ok: true, group };
}

export async function deleteGroup(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; reason: "not_found" | "managed" }> {
  const existing = await getGroupByIdDB({ id: input.id });
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.managed) return { ok: false, reason: "managed" };
  await deleteGroupDB({ id: input.id });
  await invalidateAllEffectivePermissions();
  return { ok: true };
}
