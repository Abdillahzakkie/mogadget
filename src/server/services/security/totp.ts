import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { env } from "../../constants/environments";
import { decryptSecret, encryptSecret } from "../../lib/crypto";
import { getUserSecurityDB, updateUserSecurityDB } from "../../models/userSecurity";
import type { ISecurityStatusDto } from "../../models/userSecurity/types";
import { generateRecoveryCodes, hashRecoveryCodes, matchAndRemoveCode } from "./recovery";

// Allow ±30s of clock drift between the server and the authenticator app.
const EPOCH_TOLERANCE = 30;

export type SecurityStatus = ISecurityStatusDto;

export async function getSecurityStatus({ userId }: { userId: string }): Promise<SecurityStatus> {
  const sec = await getUserSecurityDB({ userId });
  return {
    totpEnabled: sec?.totpEnabled ?? false,
    recoveryCodesRemaining: sec?.recoveryCodes.length ?? 0,
  };
}

export type TotpSetupResult =
  | { ok: true; otpauthUrl: string; qrDataUrl: string; secret: string }
  | { ok: false; reason: "insecure_key" };

// Begin enrolment: mint a secret, stash it (encrypted) and return provisioning material. Enrolment
// is only completed by totpEnable after the user confirms a code. In production we refuse to
// provision when the credential key is only derived from SESSION_SECRET (rotating it would orphan
// the secret) — the operator must set CREDENTIAL_ENCRYPTION_KEY first.
export async function totpSetup({
  userId,
  username,
}: {
  userId: string;
  username: string;
}): Promise<TotpSetupResult> {
  if (env.isProduction && env.credentialKeyIsDerived) {
    return { ok: false, reason: "insecure_key" };
  }
  const secret = generateSecret();
  await updateUserSecurityDB({ userId, patch: { totpSecret: encryptSecret(secret) } });
  const otpauthUrl = generateURI({ issuer: env.rpName, label: username, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { ok: true, otpauthUrl, qrDataUrl, secret };
}

function verifyCode(secret: string, code: string): boolean {
  try {
    return verifySync({ token: code.trim(), secret, epochTolerance: EPOCH_TOLERANCE }).valid;
  } catch {
    return false;
  }
}

export type TotpEnableResult =
  | { ok: true; recoveryCodes: string[] }
  | { ok: false; reason: "no_setup" | "bad_code" };

// Complete enrolment: verify a live code against the stashed secret, then flip enabled and mint
// recovery codes (returned once, in plaintext).
export async function totpEnable({
  userId,
  code,
}: {
  userId: string;
  code: string;
}): Promise<TotpEnableResult> {
  const sec = await getUserSecurityDB({ userId });
  if (!sec?.totpSecret) return { ok: false, reason: "no_setup" };
  if (!verifyCode(decryptSecret(sec.totpSecret), code)) return { ok: false, reason: "bad_code" };
  const recoveryCodes = generateRecoveryCodes();
  await updateUserSecurityDB({
    userId,
    patch: { totpEnabled: true, recoveryCodes: await hashRecoveryCodes(recoveryCodes) },
  });
  return { ok: true, recoveryCodes };
}

// Verify a login-time TOTP code (only when 2FA is actually enabled).
export async function verifyTotpForUser({
  userId,
  code,
}: {
  userId: string;
  code: string;
}): Promise<boolean> {
  const sec = await getUserSecurityDB({ userId });
  if (!sec?.totpEnabled || !sec.totpSecret) return false;
  return verifyCode(decryptSecret(sec.totpSecret), code);
}

// Consume a single-use recovery code (login fallback). Returns true and removes it on match.
export async function consumeRecoveryCode({
  userId,
  code,
}: {
  userId: string;
  code: string;
}): Promise<boolean> {
  const sec = await getUserSecurityDB({ userId });
  if (!sec?.totpEnabled) return false;
  const { matched, remaining } = await matchAndRemoveCode(sec.recoveryCodes, code);
  if (!matched) return false;
  await updateUserSecurityDB({ userId, patch: { recoveryCodes: remaining } });
  return true;
}

// Disable 2FA — requires a valid current code (TOTP or recovery). Clears the secret and codes.
export async function totpDisable({
  userId,
  code,
}: {
  userId: string;
  code: string;
}): Promise<{ ok: boolean }> {
  const valid =
    (await verifyTotpForUser({ userId, code })) || (await consumeRecoveryCode({ userId, code }));
  if (!valid) return { ok: false };
  await updateUserSecurityDB({
    userId,
    patch: { totpEnabled: false, totpSecret: "", recoveryCodes: [] },
  });
  return { ok: true };
}

export type RegenerateResult =
  | { ok: true; recoveryCodes: string[] }
  | { ok: false; reason: "not_enabled" | "bad_code" };

// Issue a fresh set of recovery codes (invalidates the old set). Requires a valid TOTP code.
export async function regenerateRecoveryCodes({
  userId,
  code,
}: {
  userId: string;
  code: string;
}): Promise<RegenerateResult> {
  const sec = await getUserSecurityDB({ userId });
  if (!sec?.totpEnabled) return { ok: false, reason: "not_enabled" };
  if (!(await verifyTotpForUser({ userId, code }))) return { ok: false, reason: "bad_code" };
  const recoveryCodes = generateRecoveryCodes();
  await updateUserSecurityDB({
    userId,
    patch: { recoveryCodes: await hashRecoveryCodes(recoveryCodes) },
  });
  return { ok: true, recoveryCodes };
}
