import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import { Group, upsertGroupByNameDB } from "../../models/groups";
import { Policy, upsertPolicyByNameDB } from "../../models/policies";
import { User, upsertUserByUsernameDB } from "../../models/users";
import resolveEffectivePermissions, {
  invalidateEffectivePermissions,
} from "./resolveEffectivePermissions";

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
    const userId = String(usr?._id);
    const perms = await resolveEffectivePermissions({ userId, refreshCache: true });
    expect(perms).toContain("products:write");
    expect(perms).toContain("iam:manage");

    // Second call (no refresh) is served from the Redis cache.
    const cached = await resolveEffectivePermissions({ userId });
    expect(cached).toEqual(perms);

    // Invalidation clears the cache; a fresh resolve still returns the same set.
    await invalidateEffectivePermissions({ userId });
    expect(await resolveEffectivePermissions({ userId })).toContain("products:write");
  });

  it("returns an empty set for an unknown user", async () => {
    expect(
      await resolveEffectivePermissions({ userId: "0123456789abcdef01234567", refreshCache: true }),
    ).toEqual([]);
  });
});
