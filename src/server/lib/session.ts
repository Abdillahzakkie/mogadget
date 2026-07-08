import { jwtVerify, SignJWT } from "jose";
import { env } from "../constants/environments";

export interface ISessionPayload {
  sub: string;
  username: string;
  perms?: string[];
}
const secret = () => new TextEncoder().encode(env.sessionSecret);

export async function signSession(
  payload: ISessionPayload,
  maxAgeSeconds = env.sessionMaxAgeSeconds,
): Promise<string> {
  return new SignJWT({ username: payload.username, perms: payload.perms })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secret());
}
export async function verifySession(token: string): Promise<ISessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return {
      sub: String(payload.sub),
      username: String(payload.username),
      perms: payload.perms as string[] | undefined,
    };
  } catch {
    return null;
  }
}
