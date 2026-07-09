import { redisDel, redisGet, redisSet } from "../databases/redis";

// WebAuthn challenges are short-lived, single-use secrets. We stash them in Redis keyed by a
// scope ("reg" for registration, "auth" for login) plus an id, with a 5-minute TTL, then consume
// (read-and-delete) them exactly once during verification so a challenge can never be replayed.
const CHALLENGE_TTL_SECONDS = 300;

function key(scope: string, id: string): string {
  return `webauthn:${scope}:${id}`;
}

export async function stashChallenge(scope: string, id: string, challenge: string): Promise<void> {
  await redisSet(key(scope, id), challenge, CHALLENGE_TTL_SECONDS);
}

export async function consumeChallenge(scope: string, id: string): Promise<string | null> {
  const k = key(scope, id);
  const value = await redisGet(k);
  await redisDel(k);
  return value;
}
