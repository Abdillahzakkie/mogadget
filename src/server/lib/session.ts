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
    return {
      sub: String(payload.sub),
      username: String(payload.username),
      perms: payload.perms as string[] | undefined,
    };
  } catch {
    return null;
  }
}
