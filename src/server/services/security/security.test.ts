import { generateSync } from "otplib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectMongoDB, disconnectMongoDB } from "../../databases/mongoDB";
import { connectRedis, redis } from "../../databases/redis";
import { decryptSecret } from "../../lib/crypto";
import { getUserSecurityDB, UserSecurity } from "../../models/userSecurity";
import {
  consumeRecoveryCode,
  getSecurityStatus,
  regenerateRecoveryCodes,
  totpDisable,
  totpEnable,
  totpSetup,
  verifyTotpForUser,
} from "./totp";

const USER = "sectest-user-1";

describe("security / TOTP 2FA", () => {
  beforeAll(async () => {
    await connectMongoDB();
    await connectRedis();
  });
  afterAll(async () => {
    await UserSecurity.deleteMany({ userId: /sectest-/ });
    await redis.quit();
    await disconnectMongoDB();
  });

  async function currentCode(): Promise<string> {
    const sec = await getUserSecurityDB({ userId: USER });
    return generateSync({ secret: decryptSecret(sec?.totpSecret ?? "") });
  }

  it("reports disabled 2FA before setup", async () => {
    const status = await getSecurityStatus({ userId: USER });
    expect(status).toEqual({ totpEnabled: false, recoveryCodesRemaining: 0 });
  });

  it("sets up and stores an encrypted secret", async () => {
    const res = await totpSetup({ userId: USER, username: "owner" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.otpauthUrl).toContain("otpauth://");
      expect(res.qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    }
    const sec = await getUserSecurityDB({ userId: USER });
    expect(sec?.totpSecret).toBeTruthy();
    expect(sec?.totpSecret).not.toContain(res.ok ? res.secret : "");
    expect(sec?.totpEnabled).toBe(false);
  });

  it("rejects enable with a wrong code and enables with a correct one", async () => {
    const bad = await totpEnable({ userId: USER, code: "000000" });
    expect(bad).toEqual({ ok: false, reason: "bad_code" });

    const enabled = await totpEnable({ userId: USER, code: await currentCode() });
    expect(enabled.ok).toBe(true);
    if (enabled.ok) expect(enabled.recoveryCodes).toHaveLength(10);

    const status = await getSecurityStatus({ userId: USER });
    expect(status.totpEnabled).toBe(true);
    expect(status.recoveryCodesRemaining).toBe(10);
  });

  it("verifies a login-time code", async () => {
    expect(await verifyTotpForUser({ userId: USER, code: await currentCode() })).toBe(true);
    expect(await verifyTotpForUser({ userId: USER, code: "999999" })).toBe(false);
  });

  it("consumes a recovery code exactly once", async () => {
    const res = await regenerateRecoveryCodes({ userId: USER, code: await currentCode() });
    expect(res.ok).toBe(true);
    const code = res.ok ? res.recoveryCodes[0]! : "";

    expect(await consumeRecoveryCode({ userId: USER, code })).toBe(true);
    // Second use fails (single-use), and the count dropped.
    expect(await consumeRecoveryCode({ userId: USER, code })).toBe(false);
    const status = await getSecurityStatus({ userId: USER });
    expect(status.recoveryCodesRemaining).toBe(9);
  });

  it("disables 2FA only with a valid code and clears the secret", async () => {
    expect(await totpDisable({ userId: USER, code: "111111" })).toEqual({ ok: false });
    const res = await totpDisable({ userId: USER, code: await currentCode() });
    expect(res).toEqual({ ok: true });
    const status = await getSecurityStatus({ userId: USER });
    expect(status).toEqual({ totpEnabled: false, recoveryCodesRemaining: 0 });
  });
});
