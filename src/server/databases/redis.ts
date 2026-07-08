import Redis from "ioredis";
import { env } from "../constants/environments";

declare global {
  // eslint-disable-next-line no-var
  var __mogadgetRedis: Redis | undefined;
}

export const redis: Redis =
  globalThis.__mogadgetRedis ??
  new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });
if (!globalThis.__mogadgetRedis) globalThis.__mogadgetRedis = redis;

export async function connectRedis(): Promise<void> {
  if (redis.status === "ready") return;
  if (redis.status === "wait") await redis.connect().catch(() => undefined);
  await Promise.race([
    redis.ping(),
    new Promise((_, rej) => setTimeout(() => rej(new Error("redis ping timeout")), 5000)),
  ]);
}

export async function redisUpdateKeyString<T>(
  key: string,
  data: T,
  expire = true,
  seconds = 60,
): Promise<void> {
  const payload = JSON.stringify(data);
  if (expire) await redis.setex(key, seconds, payload);
  else await redis.set(key, payload);
}
export async function redisRetrieveKeyString<T>(key: string): Promise<T | undefined> {
  const raw = await redis.get(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}
async function scanMatching(pattern: string): Promise<string[]> {
  const found: string[] = [];
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 250);
    cursor = next;
    found.push(...keys);
  } while (cursor !== "0");
  return found;
}
export async function redisDeleteKeys(...patterns: string[]): Promise<number> {
  const keys = new Set<string>();
  for (const p of patterns) {
    if (p.includes("*")) {
      for (const k of await scanMatching(p)) keys.add(k);
    } else {
      keys.add(p);
    }
  }
  if (keys.size === 0) return 0;
  const arr = Array.from(keys);
  let removed = 0;
  for (let i = 0; i < arr.length; i += 500) removed += await redis.del(...arr.slice(i, i + 500));
  return removed;
}
export const redisGet = (k: string) => redis.get(k);
export const redisSet = (k: string, v: string, ttl?: number) =>
  ttl ? redis.setex(k, ttl, v) : redis.set(k, v);
export const redisDel = (k: string) => redis.del(k);
export const redisIncr = (k: string) => redis.incr(k);
