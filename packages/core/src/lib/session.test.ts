import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./session";

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
});
