import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "../../lib/password";

// One-time recovery codes shown once at 2FA enrolment. Stored bcrypt-hashed; a code is consumed
// (removed) on use. Format: `xxxxx-xxxxx` lower-case hex — easy to read back over the phone.
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const hex = randomBytes(5).toString("hex"); // 10 hex chars
    return `${hex.slice(0, 5)}-${hex.slice(5, 10)}`;
  });
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => hashPassword(c)));
}

// Find a matching hashed code (constant-ish, checks all) and return the array without it.
export async function matchAndRemoveCode(
  hashed: string[],
  code: string,
): Promise<{ matched: boolean; remaining: string[] }> {
  const normalized = code.trim().toLowerCase();
  for (let i = 0; i < hashed.length; i++) {
    const h = hashed[i];
    if (h && (await verifyPassword(h, normalized))) {
      return { matched: true, remaining: hashed.filter((_, j) => j !== i) };
    }
  }
  return { matched: false, remaining: hashed };
}
