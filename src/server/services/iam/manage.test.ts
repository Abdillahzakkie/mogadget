import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import { Group, upsertGroupByNameDB } from "../../models/groups";
import { Policy, upsertPolicyByNameDB } from "../../models/policies";
import { User, upsertUserByUsernameDB } from "../../models/users";
import { createGroup, deleteGroup, listGroups, updateGroup } from "./groups";
import { createPolicy, deletePolicy, updatePolicy } from "./policies";
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
