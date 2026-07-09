import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import { AdminAuditLog, createAuditLogDB } from "../../models/adminAuditLogs";
import { User, upsertUserByUsernameDB } from "../../models/users";
import queryAuditLogs from "./queryAuditLogs";

describe("queryAuditLogs", () => {
  let userId: string;

  beforeAll(async () => {
    await connectMongoDB();
    await connectRedis();

    const usr = await upsertUserByUsernameDB({
      username: "audittest-actor",
      passwordHash: "x",
    });
    userId = String(usr?._id);

    // Two "login" entries by the known user, one "logout" by the same user,
    // and one "purge" with a null userId (a system action).
    await createAuditLogDB({
      userId,
      action: "AUDITTEST_LOGIN",
      responseCode: 200,
      durationMs: 5,
    });
    await createAuditLogDB({
      userId,
      action: "AUDITTEST_LOGIN",
      responseCode: 200,
      durationMs: 6,
    });
    await createAuditLogDB({
      userId,
      action: "AUDITTEST_LOGOUT",
      responseCode: 200,
      durationMs: 7,
    });
    await createAuditLogDB({
      userId: null,
      action: "AUDITTEST_PURGE",
      responseCode: 200,
      durationMs: 8,
    });
  });

  afterAll(async () => {
    await Promise.all([
      AdminAuditLog.deleteMany({ action: /AUDITTEST/ }),
      User.deleteMany({ username: /audittest/ }),
    ]);
    await redis.quit();
    await disconnectMongoDB();
  });

  it("filters by exact action", async () => {
    const res = await queryAuditLogs({ action: "AUDITTEST_LOGIN" });
    expect(res.total).toBe(2);
    expect(res.items).toHaveLength(2);
    expect(res.items.every((i) => i.action === "AUDITTEST_LOGIN")).toBe(true);
  });

  it("paginates: total reflects the full filter, items the page size", async () => {
    const from = new Date(Date.now() - 60_000);
    const page1 = await queryAuditLogs({ from, limit: 2, page: 1 });
    expect(page1.total).toBe(4);
    expect(page1.items).toHaveLength(2);
    expect(page1.page).toBe(1);
    expect(page1.limit).toBe(2);

    const page2 = await queryAuditLogs({ from, limit: 2, page: 2 });
    expect(page2.total).toBe(4);
    expect(page2.items).toHaveLength(2);
    expect(page2.page).toBe(2);
  });

  it("resolves a known userId to its username", async () => {
    const res = await queryAuditLogs({ action: "AUDITTEST_LOGOUT" });
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.username).toBe("audittest-actor");
  });

  it("maps a null userId to 'system'", async () => {
    const res = await queryAuditLogs({ action: "AUDITTEST_PURGE" });
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.username).toBe("system");
  });

  it("respects a date window via from/to", async () => {
    const from = new Date(Date.now() - 60_000);
    const to = new Date(Date.now() + 60_000);
    const res = await queryAuditLogs({ from, to });
    expect(res.total).toBe(4);
  });

  it("maps a present-but-unknown userId to 'system'", async () => {
    await createAuditLogDB({
      userId: "0123456789abcdef01234567",
      action: "AUDITTEST_ORPHAN",
      responseCode: 200,
      durationMs: 3,
    });
    const res = await queryAuditLogs({ action: "AUDITTEST_ORPHAN" });
    expect(res.items[0]?.username).toBe("system");
  });

  it("returns an empty result for an unmatched action", async () => {
    const res = await queryAuditLogs({ action: "AUDITTEST_NOPE" });
    expect(res.total).toBe(0);
    expect(res.items).toEqual([]);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(50);
  });
});
