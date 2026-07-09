import { describe, expect, it } from "vitest";
import { signPending2fa, signSession, verifyPending2fa, verifySession } from "./session";

describe("session jwt", () => {
  it("round-trips a payload", async () => {
    const t = await signSession({ sub: "u1", username: "owner", perms: ["products:write"] }, 60);
    const p = await verifySession(t);
    expect(p?.sub).toBe("u1");
    expect(p?.perms).toEqual(["products:write"]);
  });
  it("rejects a tampered token", async () => {
    expect(await verifySession("nope.nope.nope")).toBeNull();
  });

  it("issues and verifies a pending-2FA token", async () => {
    const t = await signPending2fa({ sub: "u1", username: "owner" });
    const p = await verifyPending2fa(t);
    expect(p).toEqual({ sub: "u1", username: "owner" });
  });

  it("never accepts a pending-2FA token as a full session", async () => {
    const pending = await signPending2fa({ sub: "u1", username: "owner" });
    // The pending token must be rejected by verifySession even though it's a valid JWT.
    expect(await verifySession(pending)).toBeNull();
  });

  it("does not accept a full session token as a pending-2FA token", async () => {
    const full = await signSession({ sub: "u1", username: "owner" }, 60);
    expect(await verifyPending2fa(full)).toBeNull();
    expect(await verifyPending2fa("garbage")).toBeNull();
  });
});
