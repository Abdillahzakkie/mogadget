import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import * as groupsModel from "../../models/groups";
import { Group, upsertGroupByNameDB } from "../../models/groups";
import * as policiesModel from "../../models/policies";
import { Policy, upsertPolicyByNameDB } from "../../models/policies";
import * as usersModel from "../../models/users";
import { User, upsertUserByUsernameDB } from "../../models/users";
import { createGroup, deleteGroup, listGroups, updateGroup } from "./groups";
import { createPolicy, deletePolicy, listPolicies, updatePolicy } from "./policies";
import { createUser, deleteUser, listUsers, resetPassword, updateUserAccess } from "./users";

describe("iam management", () => {
  let adminPolicyId: string;
  let adminGroupId: string;
  let adminUserId: string;

  beforeAll(async () => {
    await connectMongoDB();
    await connectRedis();
    // An admin group backed by a "*" policy, plus the sole admin user.
    const pol = await upsertPolicyByNameDB({
      name: "MTestAdmin",
      managed: true,
      statements: [{ effect: "Allow", actions: ["*"] }],
    });
    adminPolicyId = String(pol?._id);
    const grp = await upsertGroupByNameDB({
      name: "MTestAdmins",
      managed: true,
      policyIds: [adminPolicyId],
    });
    adminGroupId = String(grp?._id);
    const usr = await upsertUserByUsernameDB({
      username: "mtest-owner",
      passwordHash: "x",
      groupIds: [adminGroupId],
    });
    adminUserId = String(usr?._id);
  });

  afterAll(async () => {
    await Promise.all([
      Policy.deleteMany({ name: /MTest/ }),
      Group.deleteMany({ name: /MTest/ }),
      User.deleteMany({ username: /mtest-/ }),
    ]);
    await redis.flushdb();
    await redis.quit();
    await disconnectMongoDB();
  });

  it("lists users without password hashes", async () => {
    const users = await listUsers();
    const me = users.find((u) => u.username === "mtest-owner");
    expect(me).toBeTruthy();
    expect(me).not.toHaveProperty("passwordHash");
  });

  it("creates a user and rejects a duplicate username", async () => {
    const r = await createUser({
      username: "mtest-staff",
      password: "password123",
      groupIds: [],
      attachedPolicyIds: [],
    });
    expect(r.ok).toBe(true);
    const dup = await createUser({
      username: "mtest-staff",
      password: "password123",
      groupIds: [],
      attachedPolicyIds: [],
    });
    expect(dup).toEqual({ ok: false, reason: "taken" });
  });

  it("resets a user's password", async () => {
    const staff = (await listUsers()).find((u) => u.username === "mtest-staff");
    const r = await resetPassword({ id: String(staff?._id), newPassword: "new-password-1" });
    expect(r.ok).toBe(true);
  });

  it("refuses to delete your own account", async () => {
    const r = await deleteUser({ id: adminUserId, actingUserId: adminUserId });
    expect(r).toEqual({ ok: false, reason: "self" });
  });

  it("refuses to delete the last admin", async () => {
    // A different acting user tries to delete the sole admin.
    const r = await deleteUser({ id: adminUserId, actingUserId: "0123456789abcdef01234567" });
    expect(r).toEqual({ ok: false, reason: "last_admin" });
  });

  it("refuses to strip the last admin's access", async () => {
    const r = await updateUserAccess({ id: adminUserId, groupIds: [], attachedPolicyIds: [] });
    expect(r).toEqual({ ok: false, reason: "last_admin" });
    // Access was reverted — the admin still has their group.
    const me = (await listUsers()).find((u) => u.username === "mtest-owner");
    expect(me?.groupIds).toContain(adminGroupId);
  });

  it("creates, validates, and manages policies", async () => {
    const bad = await createPolicy({
      name: "MTestBad",
      statements: [{ effect: "Allow", actions: ["not-a-real-permission"] }],
    });
    expect(bad).toEqual({ ok: false, reason: "invalid" });

    const good = await createPolicy({
      name: "MTestReadOnly",
      statements: [{ effect: "Allow", actions: ["products:read"] }],
    });
    expect(good.ok).toBe(true);
    const policyId = good.ok ? String(good.policy._id) : "";

    const upd = await updatePolicy({
      id: policyId,
      patch: { statements: [{ effect: "Allow", actions: ["analytics:read"] }] },
    });
    expect(upd.ok).toBe(true);

    // Managed built-ins cannot be edited or deleted.
    const managed = await updatePolicy({ id: adminPolicyId, patch: { name: "hacked" } });
    expect(managed).toEqual({ ok: false, reason: "managed" });
    const delManaged = await deletePolicy({ id: adminPolicyId });
    expect(delManaged).toEqual({ ok: false, reason: "managed" });

    const del = await deletePolicy({ id: policyId });
    expect(del).toEqual({ ok: true });
  });

  it("surfaces a 'failed' result when a DB write returns null", async () => {
    vi.spyOn(usersModel, "createUserDB").mockResolvedValueOnce(null);
    expect(
      await createUser({
        username: "mtest-x",
        password: "password123",
        groupIds: [],
        attachedPolicyIds: [],
      }),
    ).toEqual({ ok: false, reason: "failed" });

    vi.spyOn(groupsModel, "createGroupDB").mockResolvedValueOnce(null);
    expect(await createGroup({ name: "MTestNull", policyIds: [], statements: [] })).toEqual({
      ok: false,
      reason: "failed",
    });

    vi.spyOn(policiesModel, "createPolicyDB").mockResolvedValueOnce(null);
    expect(await createPolicy({ name: "MTestNullP", statements: [] })).toEqual({
      ok: false,
      reason: "failed",
    });

    // updateUserAccess: the DB update returns null → not_found.
    const u = await upsertUserByUsernameDB({ username: "mtest-upd", passwordHash: "x" });
    vi.spyOn(usersModel, "updateUserAccessDB").mockResolvedValueOnce(null);
    expect(
      await updateUserAccess({ id: String(u?._id), groupIds: [], attachedPolicyIds: [] }),
    ).toEqual({ ok: false, reason: "not_found" });

    // update{Group,Policy} that pass guards but whose write returns null → failed.
    const g = await createGroup({ name: "MTestUpdNull", policyIds: [], statements: [] });
    if (g.ok) {
      vi.spyOn(groupsModel, "updateGroupDB").mockResolvedValueOnce(null);
      expect(await updateGroup({ id: String(g.group._id), patch: { name: "z" } })).toEqual({
        ok: false,
        reason: "failed",
      });
      await deleteGroup({ id: String(g.group._id) });
    }
    const p = await createPolicy({ name: "MTestUpdNullP", statements: [] });
    if (p.ok) {
      vi.spyOn(policiesModel, "updatePolicyDB").mockResolvedValueOnce(null);
      expect(await updatePolicy({ id: String(p.policy._id), patch: { name: "z" } })).toEqual({
        ok: false,
        reason: "failed",
      });
      await deletePolicy({ id: String(p.policy._id) });
    }
    vi.restoreAllMocks();
  });

  it("reports not_found when deleting an unknown user", async () => {
    const r = await deleteUser({ id: "0123456789abcdef01234567", actingUserId: adminUserId });
    expect(r).toEqual({ ok: false, reason: "not_found" });
  });

  it("reports not_found when the delete write itself fails", async () => {
    const u = await upsertUserByUsernameDB({ username: "mtest-delfail", passwordHash: "x" });
    const id = String(u?._id);
    vi.spyOn(usersModel, "deleteUserDB").mockResolvedValueOnce(false);
    const r = await deleteUser({ id, actingUserId: adminUserId });
    expect(r).toEqual({ ok: false, reason: "not_found" });
    vi.restoreAllMocks();
    await User.deleteOne({ _id: id });
  });

  it("rejects an update to a policy with invalid statements", async () => {
    const p = await createPolicy({ name: "MTestUpdInvalid", statements: [] });
    if (p.ok) {
      const bad = await updatePolicy({
        id: String(p.policy._id),
        patch: { statements: [{ effect: "Allow", actions: ["nope"] }] },
      });
      expect(bad).toEqual({ ok: false, reason: "invalid" });
      await deletePolicy({ id: String(p.policy._id) });
    }
  });

  it("updates and deletes a non-admin user (success paths)", async () => {
    const created = await createUser({
      username: "mtest-editor",
      password: "password123",
      groupIds: [],
      attachedPolicyIds: [],
    });
    const editorId = created.ok ? String(created.user._id) : "";

    // Grant then change access — the sole admin still stands, so this succeeds.
    const upd = await updateUserAccess({
      id: editorId,
      groupIds: [],
      attachedPolicyIds: [adminPolicyId],
    });
    expect(upd.ok).toBe(true);
    if (upd.ok) expect(upd.user.attachedPolicyIds).toContain(adminPolicyId);

    // Deleting a non-last-admin user by a different actor succeeds.
    const del = await deleteUser({ id: editorId, actingUserId: adminUserId });
    expect(del).toEqual({ ok: true });
    // updateUserAccess on a missing user reports not_found.
    const missing = await updateUserAccess({
      id: "0123456789abcdef01234567",
      groupIds: [],
      attachedPolicyIds: [],
    });
    expect(missing).toEqual({ ok: false, reason: "not_found" });
  });

  it("updates a group and rejects invalid statements", async () => {
    const g = await createGroup({ name: "MTestOps", policyIds: [], statements: [] });
    const groupId = g.ok ? String(g.group._id) : "";
    const renamed = await updateGroup({ id: groupId, patch: { name: "MTestOps2" } });
    expect(renamed.ok).toBe(true);

    const badCreate = await createGroup({
      name: "MTestBadGroup",
      policyIds: [],
      statements: [{ effect: "Allow", actions: ["nope"] }],
    });
    expect(badCreate).toEqual({ ok: false, reason: "invalid" });

    const badUpdate = await updateGroup({
      id: groupId,
      patch: { statements: [{ effect: "Allow", actions: ["nope"] }] },
    });
    expect(badUpdate).toEqual({ ok: false, reason: "invalid" });

    const missing = await updateGroup({ id: "0123456789abcdef01234567", patch: { name: "x" } });
    expect(missing).toEqual({ ok: false, reason: "not_found" });
    await deleteGroup({ id: groupId });
  });

  it("reports not_found for updating/deleting a missing policy or group", async () => {
    expect(await updatePolicy({ id: "0123456789abcdef01234567", patch: { name: "x" } })).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await deletePolicy({ id: "0123456789abcdef01234567" })).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await deleteGroup({ id: "0123456789abcdef01234567" })).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(Array.isArray(await listPolicies())).toBe(true);
    const taken = await createPolicy({ name: "MTestReadOnly2", statements: [] });
    expect(taken.ok).toBe(true);
    const dup = await createPolicy({ name: "MTestReadOnly2", statements: [] });
    expect(dup).toEqual({ ok: false, reason: "taken" });
    if (taken.ok) await deletePolicy({ id: String(taken.policy._id) });
  });

  it("creates and deletes groups, protecting managed built-ins", async () => {
    const g = await createGroup({ name: "MTestEditors", policyIds: [], statements: [] });
    expect(g.ok).toBe(true);
    const groupId = g.ok ? String(g.group._id) : "";

    const groups = await listGroups();
    expect(groups.some((x) => x.name === "MTestEditors")).toBe(true);

    const managed = await updateGroup({ id: adminGroupId, patch: { name: "hacked" } });
    expect(managed).toEqual({ ok: false, reason: "managed" });

    const del = await deleteGroup({ id: groupId });
    expect(del).toEqual({ ok: true });
    const delManaged = await deleteGroup({ id: adminGroupId });
    expect(delManaged).toEqual({ ok: false, reason: "managed" });
  });
});
