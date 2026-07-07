import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  redis,
  connectRedis,
  redisUpdateKeyString,
  redisRetrieveKeyString,
  redisDeleteKeys,
  redisGet,
  redisSet,
  redisDel,
  redisIncr,
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
  it("stores a non-expiring value and returns raw for non-JSON", async () => {
    await redisUpdateKeyString("t:persist", "plain-string", false);
    // Stored as a JSON string; round-trips back to the string.
    expect(await redisRetrieveKeyString("t:persist")).toBe("plain-string");
    // A value that is not valid JSON comes back raw.
    await redis.set("t:raw", "not{json");
    expect(await redisRetrieveKeyString("t:raw")).toBe("not{json");
  });
  it("deleting an empty pattern set removes nothing", async () => {
    expect(await redisDeleteKeys()).toBe(0);
  });
  it("primitive helpers get/set/del/incr work", async () => {
    await redisSet("t:p", "1");
    expect(await redisGet("t:p")).toBe("1");
    await redisSet("t:ttl", "2", 30);
    expect(await redisGet("t:ttl")).toBe("2");
    expect(await redisIncr("t:n")).toBe(1);
    expect(await redisDel("t:p")).toBe(1);
  });
});
