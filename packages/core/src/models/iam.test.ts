import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../databases/mongoDB";
import { upsertPolicyByNameDB, Policy } from "./policies";
import { upsertGroupByNameDB, Group } from "./groups";
import { upsertUserByUsernameDB, User } from "./users";

describe("iam models upsert", () => {
  beforeAll(async () => {
    await connectMongoDB();
  });
  afterAll(async () => {
    // Anchor to this file's own fixtures (TestAdmin/TestGroup/test-owner). Unanchored
    // /Test/ + /test/ also match the resolveEffectivePermissions test's RTest/rtest
    // fixtures, wiping them mid-run when the files execute in parallel (shared Mongo).
    await Promise.all([
      Policy.deleteMany({ name: /^Test/ }),
      Group.deleteMany({ name: /^Test/ }),
      User.deleteMany({ username: /^test/ }),
    ]);
    await disconnectMongoDB();
  });
  it("upserts a policy idempotently by name", async () => {
    const a = await upsertPolicyByNameDB({
      name: "TestAdmin",
      managed: true,
      statements: [{ effect: "Allow", actions: ["*"] }],
    });
    const b = await upsertPolicyByNameDB({
      name: "TestAdmin",
      managed: true,
      statements: [{ effect: "Allow", actions: ["*"] }],
    });
    expect(a?._id).toBeDefined();
    expect(String(a?._id)).toBe(String(b?._id));
  });
  it("attaches a group to a user", async () => {
    const g = await upsertGroupByNameDB({ name: "TestGroup", managed: true, policyIds: [] });
    const u = await upsertUserByUsernameDB({
      username: "test-owner",
      passwordHash: "x",
      groupIds: [String(g?._id)],
    });
    expect(u?.groupIds.map(String)).toContain(String(g?._id));
  });
});
