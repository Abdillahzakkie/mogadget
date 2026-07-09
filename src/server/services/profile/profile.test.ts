import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import { hashPassword } from "../../lib/password";
import { createUserDB, User } from "../../models/users";
import changePassword from "./changePassword";
import changeUsername from "./changeUsername";
import getMyProfile from "./getMyProfile";
import updateProfile from "./updateProfile";

describe("profile service", () => {
  let userId: string;

  beforeAll(async () => {
    await connectMongoDB();
    await connectRedis();
    const u = await createUserDB({
      username: "ptest-owner",
      passwordHash: await hashPassword("original-pw"),
    });
    userId = String(u?._id);
  });
  afterAll(async () => {
    await User.deleteMany({ username: /ptest-/ });
    await redis.quit();
    await disconnectMongoDB();
  });

  it("returns the profile DTO without a password hash", async () => {
    const p = await getMyProfile({ userId });
    expect(p?.username).toBe("ptest-owner");
    expect(p).not.toHaveProperty("passwordHash");
    expect(p?.preferences).toEqual({});
  });

  it("updates profile fields", async () => {
    const p = await updateProfile({
      userId,
      patch: {
        displayName: "Mo Owner",
        email: "mo@example.com",
        preferences: { timezone: "Africa/Lagos" },
      },
    });
    expect(p?.displayName).toBe("Mo Owner");
    expect(p?.email).toBe("mo@example.com");
    expect(p?.preferences.timezone).toBe("Africa/Lagos");
  });

  it("rejects a password change with the wrong current password", async () => {
    const r = await changePassword({
      userId,
      currentPassword: "not-it",
      newPassword: "brand-new-pw",
    });
    expect(r).toEqual({ ok: false, reason: "wrong_current" });
  });

  it("rejects reusing the same password", async () => {
    const r = await changePassword({
      userId,
      currentPassword: "original-pw",
      newPassword: "original-pw",
    });
    expect(r).toEqual({ ok: false, reason: "same_password" });
  });

  it("changes the password with the correct current password", async () => {
    const r = await changePassword({
      userId,
      currentPassword: "original-pw",
      newPassword: "a-fresh-password",
    });
    expect(r).toEqual({ ok: true });
    // The new password now verifies.
    const again = await changePassword({
      userId,
      currentPassword: "a-fresh-password",
      newPassword: "original-pw",
    });
    expect(again).toEqual({ ok: true });
  });

  it("returns null / not_found for an unknown user", async () => {
    const unknown = "0123456789abcdef01234567";
    expect(await getMyProfile({ userId: unknown })).toBeNull();
    expect(await updateProfile({ userId: unknown, patch: { displayName: "x" } })).toBeNull();
    expect(
      await changePassword({ userId: unknown, currentPassword: "a", newPassword: "bbbbbbbb" }),
    ).toEqual({ ok: false, reason: "not_found" });
    expect(await changeUsername({ userId: unknown, username: "whatever" })).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("changes the username when free and rejects a taken one", async () => {
    await createUserDB({ username: "ptest-taken", passwordHash: await hashPassword("x") });
    const taken = await changeUsername({ userId, username: "ptest-taken" });
    expect(taken).toEqual({ ok: false, reason: "taken" });

    const okRes = await changeUsername({ userId, username: "ptest-renamed" });
    expect(okRes.ok).toBe(true);
    if (okRes.ok) expect(okRes.profile.username).toBe("ptest-renamed");
  });
});
