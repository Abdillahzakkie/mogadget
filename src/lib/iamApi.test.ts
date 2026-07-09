import { beforeEach, describe, expect, it, vi } from "vitest";

const { post, patch, del, get } = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  get: vi.fn(),
}));
vi.mock("../constants/fetcher", () => ({ api: { post, patch, delete: del, get } }));

import { iamApi } from "./iamApi";

const envelope = (data: unknown) => ({ data: { data } });
beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  del.mockReset();
  get.mockReset();
});

describe("iamApi", () => {
  it("users: list / create / updateAccess / delete / resetPassword", async () => {
    get.mockResolvedValue(envelope([{ _id: "u1" }]));
    post.mockResolvedValue(envelope({ _id: "u2" }));
    patch.mockResolvedValue(envelope({ _id: "u1" }));
    del.mockResolvedValue(envelope({ deleted: true }));

    await iamApi.listUsers();
    expect(get).toHaveBeenCalledWith("/admin/iam/users");

    await iamApi.createUser({ username: "a", password: "pw", groupIds: [], attachedPolicyIds: [] });
    expect(post).toHaveBeenCalledWith("/admin/iam/users", {
      username: "a",
      password: "pw",
      groupIds: [],
      attachedPolicyIds: [],
    });

    await iamApi.updateUserAccess("u1", ["g1"], ["p1"]);
    expect(patch).toHaveBeenCalledWith("/admin/iam/users/u1", {
      patch: { groupIds: ["g1"], attachedPolicyIds: ["p1"] },
    });

    await iamApi.deleteUser("u1");
    expect(del).toHaveBeenCalledWith("/admin/iam/users/u1");

    await iamApi.resetPassword("u1", "newpassword");
    expect(post).toHaveBeenCalledWith("/admin/iam/users/u1/password", {
      newPassword: "newpassword",
    });
  });

  it("groups and policies: list / create / delete", async () => {
    get.mockResolvedValue(envelope([]));
    post.mockResolvedValue(envelope({ _id: "x" }));
    del.mockResolvedValue(envelope({ deleted: true }));

    await iamApi.listGroups();
    expect(get).toHaveBeenCalledWith("/admin/iam/groups");
    await iamApi.createGroup({ name: "Editors", policyIds: ["p1"], statements: [] });
    expect(post).toHaveBeenCalledWith("/admin/iam/groups", {
      name: "Editors",
      policyIds: ["p1"],
      statements: [],
    });
    await iamApi.deleteGroup("g1");
    expect(del).toHaveBeenCalledWith("/admin/iam/groups/g1");

    await iamApi.listPolicies();
    expect(get).toHaveBeenCalledWith("/admin/iam/policies");
    await iamApi.createPolicy({ name: "RO", statements: [{ effect: "Allow", actions: ["a"] }] });
    expect(post).toHaveBeenCalledWith("/admin/iam/policies", {
      name: "RO",
      statements: [{ effect: "Allow", actions: ["a"] }],
    });
    await iamApi.deletePolicy("p1");
    expect(del).toHaveBeenCalledWith("/admin/iam/policies/p1");
  });
});
