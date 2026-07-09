import jwt from "jsonwebtoken";
import { env } from "../constants/environments";

export interface ISessionPayload {
  sub: string;
  username: string;
  perms?: string[];
}

// Managerenta parity: jsonwebtoken signs/verifies on the Node runtime. The edge middleware
// (src/middleware.ts) still verifies with jose — both speak standard HS256 JWTs.
export async function signSession(
  payload: ISessionPayload,
  maxAgeSeconds = env.sessionMaxAgeSeconds,
): Promise<string> {
  return jwt.sign({ username: payload.username, perms: payload.perms }, env.sessionSecret, {
    algorithm: "HS256",
    subject: payload.sub,
    expiresIn: maxAgeSeconds,
  });
}

export async function verifySession(token: string): Promise<ISessionPayload | null> {
  try {
    const payload = jwt.verify(token, env.sessionSecret, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
    // A pending-2FA token has only cleared the password step — it must NEVER be accepted as a
    // full session, even if an attacker moves it into the mg_session cookie.
    if (payload.stage === "2fa") return null;
    return {
      sub: String(payload.sub),
      username: String(payload.username),
      perms: payload.perms as string[] | undefined,
    };
  } catch {
    return null;
  }
}

// A short-lived token that proves the password step succeeded but 2FA is still pending. Carried
// in a dedicated cookie (mg_2fa), redeemed at /api/admin/login/totp for a real session.
const PENDING_2FA_TTL = 5 * 60;
export async function signPending2fa(payload: { sub: string; username: string }): Promise<string> {
  return jwt.sign({ username: payload.username, stage: "2fa" }, env.sessionSecret, {
    algorithm: "HS256",
    subject: payload.sub,
    expiresIn: PENDING_2FA_TTL,
  });
}
export async function verifyPending2fa(
  token: string,
): Promise<{ sub: string; username: string } | null> {
  try {
    const payload = jwt.verify(token, env.sessionSecret, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
    if (payload.stage !== "2fa") return null;
    return { sub: String(payload.sub), username: String(payload.username) };
  } catch {
    return null;
  }
}
