import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  redis,
  connectRedis,
  redisUpdateKeyString,
  redisRetrieveKeyString,
  redisDeleteKeys,
} from "./redis";

describe("redis cache helpers", () => {
  beforeAll(async () => {
    await connectRedis();
  });
  afterAll(async () => {
    await redis.flushdb();
    await redis.quit();
  });
  it("round-trips a JSON value", async () => {
    await redisUpdateKeyString("t:one", { a: 1 }, true, 30);
    expect(await redisRetrieveKeyString<{ a: number }>("t:one")).toEqual({ a: 1 });
  });
  it("deletes by glob via SCAN", async () => {
    await redisUpdateKeyString("t:list:a", [1], true, 30);
    await redisUpdateKeyString("t:list:b", [2], true, 30);
    const removed = await redisDeleteKeys("t:list:*");
    expect(removed).toBe(2);
    expect(await redisRetrieveKeyString("t:list:a")).toBeUndefined();
  });
});
