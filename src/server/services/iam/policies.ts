import {
  createPolicyDB,
  deletePolicyDB,
  getPolicyByIdDB,
  getPolicyByNameDB,
  listPoliciesDB,
  updatePolicyDB,
} from "../../models/policies";
import type { IPolicy } from "../../models/policies/types";
import { type IPolicyStatement, isValidPolicyStatement } from "../../validators/iam";
import { invalidateAllEffectivePermissions } from "./guards";

export async function listPolicies(): Promise<IPolicy[]> {
  return listPoliciesDB();
}

export type PolicyResult =
  | { ok: true; policy: IPolicy }
  | { ok: false; reason: "taken" | "not_found" | "managed" | "invalid" | "failed" };

function statementsValid(statements: IPolicyStatement[]): boolean {
  return statements.every(isValidPolicyStatement);
}

export async function createPolicy(input: {
  name: string;
  statements: IPolicyStatement[];
}): Promise<PolicyResult> {
  if (!statementsValid(input.statements)) return { ok: false, reason: "invalid" };
  if (await getPolicyByNameDB({ name: input.name })) return { ok: false, reason: "taken" };
  const policy = await createPolicyDB(input);
  if (!policy) return { ok: false, reason: "failed" };
  await invalidateAllEffectivePermissions();
  return { ok: true, policy };
}

export async function updatePolicy(input: {
  id: string;
  patch: { name?: string; statements?: IPolicyStatement[] };
}): Promise<PolicyResult> {
  const existing = await getPolicyByIdDB({ id: input.id });
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.managed) return { ok: false, reason: "managed" };
  if (input.patch.statements && !statementsValid(input.patch.statements)) {
    return { ok: false, reason: "invalid" };
  }
  const policy = await updatePolicyDB({ id: input.id, patch: input.patch });
  if (!policy) return { ok: false, reason: "failed" };
  await invalidateAllEffectivePermissions();
  return { ok: true, policy };
}

export async function deletePolicy(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; reason: "not_found" | "managed" }> {
  const existing = await getPolicyByIdDB({ id: input.id });
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.managed) return { ok: false, reason: "managed" };
  await deletePolicyDB({ id: input.id });
  await invalidateAllEffectivePermissions();
  return { ok: true };
}
