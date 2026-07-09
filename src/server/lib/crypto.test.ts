import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

describe("crypto (AES-256-GCM secret encryption)", () => {
  it("round-trips a secret", () => {
    const plain = "JBSWY3DPEHPK3PXP";
    const enc = encryptSecret(plain);
    expect(enc).not.toContain(plain);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const a = encryptSecret("same-input");
    const b = encryptSecret("same-input");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-input");
    expect(decryptSecret(b)).toBe("same-input");
  });

  it("rejects a tampered payload", () => {
    const enc = encryptSecret("secret");
    // Flip a character in the ciphertext segment.
    const parts = enc.split(":");
    const ct = parts[3] ?? "";
    parts[3] = `${ct.slice(0, -2)}00`;
    expect(() => decryptSecret(parts.join(":"))).toThrow();
  });

  it("rejects a malformed payload", () => {
    expect(() => decryptSecret("not-a-valid-payload")).toThrow();
    expect(() => decryptSecret("v9:a:b:c")).toThrow();
  });

  it("round-trips an empty string and unicode", () => {
    expect(decryptSecret(encryptSecret(""))).toBe("");
    expect(decryptSecret(encryptSecret("café ☕ 日本"))).toBe("café ☕ 日本");
  });
});
