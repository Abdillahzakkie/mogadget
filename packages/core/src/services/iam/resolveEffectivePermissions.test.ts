import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import { upsertPolicyByNameDB, Policy } from "../../models/policies";
import { upsertGroupByNameDB, Group } from "../../models/groups";
import { upsertUserByUsernameDB, User } from "../../models/users";
import resolveEffectivePermissions from "./resolveEffectivePermissions";

describe("resolveEffectivePermissions", () => {
  beforeAll(async () => {
    await connectMongoDB();
    await connectRedis();
  });
  afterAll(async () => {
    await Promise.all([
      Policy.deleteMany({ name: /RTest/ }),
      Group.deleteMany({ name: /RTest/ }),
      User.deleteMany({ username: /rtest/ }),
    ]);
    await redis.flushdb();
    await redis.quit();
    await disconnectMongoDB();
  });
  it("compiles admin '*' into every permission via a group", async () => {
    const pol = await upsertPolicyByNameDB({
      name: "RTestAdmin",
      managed: true,
      statements: [{ effect: "Allow", actions: ["*"] }],
    });
    const grp = await upsertGroupByNameDB({
      name: "RTestAdmins",
      managed: true,
      policyIds: [String(pol?._id)],
    });
    const usr = await upsertUserByUsernameDB({
      username: "rtest-owner",
      passwordHash: "x",
      groupIds: [String(grp?._id)],
    });
    const perms = await resolveEffectivePermissions({
      userId: String(usr?._id),
      refreshCache: true,
    });
    expect(perms).toContain("products:write");
    expect(perms).toContain("iam:manage");
  });
});
