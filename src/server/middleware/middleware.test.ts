import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Permission } from "@/server/validators/iam";
import { env } from "../constants/environments";
import { ErrNotFound } from "../constants/errors";
import { connectMongoDB, disconnectMongoDB } from "../databases/mongoDB";
import { connectRedis, redis } from "../databases/redis";
import { withApiHandler } from "../lib/handler";
import { runWithRequestContext } from "../lib/requestContext";
import { ok } from "../lib/response";
import { Group, upsertGroupByNameDB } from "../models/groups";
import { Policy, upsertPolicyByNameDB } from "../models/policies";
import { User, upsertUserByUsernameDB } from "../models/users";
import { requirePermission, sessionHasPermissions, withPermission } from "./withPermission";
import { withRateLimit } from "./withRateLimit";

const reqFrom = (ip: string) => new Request("http://x", { headers: { "x-forwarded-for": ip } });

// Redis is a shared singleton; connect/quit exactly once for the whole file (quitting between
// describes would close the connection for the rest).
let adminId = "";
let noneId = "";
beforeAll(async () => {
  await connectMongoDB();
  await connectRedis();
  const pol = await upsertPolicyByNameDB({
    name: "MwTestAdmin",
    managed: true,
    statements: [{ effect: "Allow", actions: ["*"] }],
  });
  const grp = await upsertGroupByNameDB({
    name: "MwTestAdmins",
    managed: true,
    policyIds: [String(pol?._id)],
  });
  const admin = await upsertUserByUsernameDB({
    username: "mwtest-admin",
    passwordHash: "x",
    groupIds: [String(grp?._id)],
  });
  const none = await upsertUserByUsernameDB({
    username: "mwtest-none",
    passwordHash: "x",
    groupIds: [],
  });
  adminId = String(admin?._id);
  noneId = String(none?._id);
});
afterAll(async () => {
  await Promise.all([
    Policy.deleteMany({ name: /MwTest/ }),
    Group.deleteMany({ name: /MwTest/ }),
    User.deleteMany({ username: /mwtest/ }),
  ]);
  await redis.quit();
  await disconnectMongoDB();
});

describe("withRateLimit", () => {
  // These tests identify callers via x-forwarded-for, which clientIp only honors when the
  // proxy is trusted.
  beforeAll(() => {
    env.trustProxy = true;
  });
  afterAll(() => {
    env.trustProxy = false;
  });

  it("allows up to max then blocks with a 429", async () => {
    const wrapped = withRateLimit(async () => ok({ hit: true }), {
      scope: "mwtest-rl",
      max: 2,
      windowSeconds: 30,
    });
    const req = reqFrom("11.11.11.11");
    expect((await wrapped(req)).status).toBe(200);
    expect((await wrapped(req)).status).toBe(200);
    const blocked = await wrapped(req);
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/Too many requests/);
    await redis.del("rl:mwtest-rl:11.11.11.11");
  });

  it("applies default max/window and reports the window when a key has no TTL", async () => {
    const wrapped = withRateLimit(async () => ok({}), { scope: "mwtest-def" });
    // Pre-seed the counter above the default max WITHOUT a TTL → ttl(-1) branch uses windowSeconds.
    await redis.set("rl:mwtest-def:22.22.22.22", "999");
    const blocked = await wrapped(reqFrom("22.22.22.22"));
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/\d+s/);
    await redis.del("rl:mwtest-def:22.22.22.22");
  });

  it("keys on the adapter-resolved context IP; spoofed forwarded headers can't rotate the bucket", async () => {
    env.trustProxy = false;
    const wrapped = withRateLimit(async () => ok({}), {
      scope: "mwtest-ctx",
      max: 1,
      windowSeconds: 30,
    });
    const run = (spoofedXff: string) =>
      runWithRequestContext(
        { session: null, requestId: "r", cookies: [], clientIp: "203.0.113.9" },
        () => wrapped(reqFrom(spoofedXff)),
      );
    expect((await run("1.1.1.1")).status).toBe(200);
    // A different spoofed header from the same real client lands in the same bucket → blocked.
    expect((await run("2.2.2.2")).status).toBe(429);
    await redis.del("rl:mwtest-ctx:203.0.113.9");
  });
});

describe("withApiHandler", () => {
  // TRUST_PROXY is off here, so every request keys the limiter on the constant "0.0.0.0".
  afterEach(async () => {
    await redis.del(
      "rl:/api/test/ok:0.0.0.0",
      "rl:/api/test/boom:0.0.0.0",
      "rl:/api/test/rl:0.0.0.0",
    );
  });
  it("runs the handler and emits a JSON Response with rate-limit headers", async () => {
    const h = withApiHandler({ route: "/api/test/ok" }, async () => ok({ ok: 1 }));
    const res = await h(reqFrom("12.12.12.12"), undefined);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Remaining")).toBeDefined();
    expect(await res.json()).toEqual({ code: 200, message: "OK", data: { ok: 1 } });
  });
  it("maps a thrown sentinel through handleError", async () => {
    const h = withApiHandler({ route: "/api/test/boom" }, async () => {
      throw ErrNotFound;
    });
    const res = await h(reqFrom("13.13.13.13"), undefined);
    expect(res.status).toBe(404);
  });
  it("enforces its own rate limit with a Retry-After header", async () => {
    const h = withApiHandler(
      { route: "/api/test/rl", rateLimit: { max: 1, windowSeconds: 30 } },
      async () => ok({ ok: 1 }),
    );
    const req = reqFrom("14.14.14.14");
    expect((await h(req, undefined)).status).toBe(200);
    const blocked = await h(req, undefined);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeDefined();
  });
  it("verifies the session cookie and emits queued Set-Cookie headers", async () => {
    const { signSession } = await import("../lib/session");
    const { issueSessionCookie, getSessionUser } = await import("../lib/requestContext");
    const token = await signSession({ sub: adminId, username: "mwtest-admin" });
    const h = withApiHandler({ route: "/api/test/ok" }, async () => {
      issueSessionCookie("mg_session", "fresh", 100);
      return ok({ user: getSessionUser()?.username ?? null });
    });
    // Bearer header path.
    const viaBearer = await h(
      new Request("http://x", { headers: { authorization: `Bearer ${token}` } }),
      undefined,
    );
    expect((await viaBearer.json()).data.user).toBe("mwtest-admin");
    // Cookie path + Set-Cookie emission.
    const viaCookie = await h(
      new Request("http://x", { headers: { cookie: `mg_session=${encodeURIComponent(token)}` } }),
      undefined,
    );
    expect((await viaCookie.json()).data.user).toBe("mwtest-admin");
    expect(viaCookie.headers.get("set-cookie")).toMatch(/mg_session=fresh.*Max-Age=100/);
  });
});

describe("permission gating", () => {
  const withSession = <T>(sub: string, fn: () => Promise<T>) =>
    runWithRequestContext({ session: { sub, username: "u" }, requestId: "r", cookies: [] }, fn);

  it("requirePermission throws when unauthenticated", async () => {
    await expect(requirePermission(Permission.ProductsWrite)).rejects.toMatchObject({ code: 401 });
  });
  it("requirePermission throws 403 when the user lacks the permission", async () => {
    await withSession(noneId, async () => {
      await expect(requirePermission(Permission.ProductsWrite)).rejects.toMatchObject({
        code: 403,
      });
    });
  });
  it("requirePermission returns the session when the check passes", async () => {
    await withSession(adminId, async () => {
      const s = await requirePermission(Permission.ProductsWrite);
      expect(s.sub).toBe(adminId);
      // No required perms → returns without a permission check.
      expect((await requirePermission()).sub).toBe(adminId);
    });
  });
  it("sessionHasPermissions reflects the compiled permission set", async () => {
    expect(
      await sessionHasPermissions({ sub: adminId, username: "u" }, [Permission.ProductsWrite]),
    ).toBe(true);
    expect(
      await sessionHasPermissions({ sub: noneId, username: "u" }, [Permission.ProductsWrite]),
    ).toBe(false);
  });
  it("withPermission returns 401/403 envelopes or calls the handler", async () => {
    const guarded = withPermission(async () => ok({ done: true }), Permission.ProductsWrite);
    // Unauthenticated.
    expect((await guarded(new Request("http://x"))).status).toBe(401);
    // Authorized.
    await withSession(adminId, async () => {
      expect((await guarded(new Request("http://x"))).status).toBe(200);
    });
    // Authenticated but unauthorized.
    await withSession(noneId, async () => {
      expect((await guarded(new Request("http://x"))).status).toBe(403);
    });
  });
});
