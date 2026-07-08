import bcrypt from "bcrypt";

// Managerenta parity: bcrypt (was argon2). The only stored credential is the seeded owner
// account — a re-seed regenerates the hash, so no dual-verification migration path exists.
const COST = 12;

export const hashPassword = (pw: string) => bcrypt.hash(pw, COST);
export const verifyPassword = (hash: string, pw: string) =>
  bcrypt.compare(pw, hash).catch(() => false);
