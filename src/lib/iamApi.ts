import type { IGroup } from "@/server/models/groups/types";
import type { IPolicy } from "@/server/models/policies/types";
import type { IUserProfileDto } from "@/server/models/users/types";
import type { IPolicyStatement } from "@/server/validators/iam";
import { api } from "../constants/fetcher";

export const iamApi = {
  // Users
  listUsers: (): Promise<IUserProfileDto[]> => api.get("/admin/iam/users").then((r) => r.data.data),
  createUser: (input: {
    username: string;
    password: string;
    groupIds: string[];
    attachedPolicyIds: string[];
  }): Promise<IUserProfileDto> => api.post("/admin/iam/users", input).then((r) => r.data.data),
  updateUserAccess: (
    id: string,
    groupIds: string[],
    attachedPolicyIds: string[],
  ): Promise<IUserProfileDto> =>
    api
      .patch(`/admin/iam/users/${id}`, { patch: { groupIds, attachedPolicyIds } })
      .then((r) => r.data.data),
  deleteUser: (id: string): Promise<{ deleted: boolean }> =>
    api.delete(`/admin/iam/users/${id}`).then((r) => r.data.data),
  resetPassword: (id: string, newPassword: string): Promise<{ ok: boolean }> =>
    api.post(`/admin/iam/users/${id}/password`, { newPassword }).then((r) => r.data.data),

  // Groups
  listGroups: (): Promise<IGroup[]> => api.get("/admin/iam/groups").then((r) => r.data.data),
  createGroup: (input: {
    name: string;
    policyIds: string[];
    statements: IPolicyStatement[];
  }): Promise<IGroup> => api.post("/admin/iam/groups", input).then((r) => r.data.data),
  deleteGroup: (id: string): Promise<{ deleted: boolean }> =>
    api.delete(`/admin/iam/groups/${id}`).then((r) => r.data.data),

  // Policies
  listPolicies: (): Promise<IPolicy[]> => api.get("/admin/iam/policies").then((r) => r.data.data),
  createPolicy: (input: { name: string; statements: IPolicyStatement[] }): Promise<IPolicy> =>
    api.post("/admin/iam/policies", input).then((r) => r.data.data),
  deletePolicy: (id: string): Promise<{ deleted: boolean }> =>
    api.delete(`/admin/iam/policies/${id}`).then((r) => r.data.data),
};
