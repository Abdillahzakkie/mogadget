import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../constants/environments";
import { ErrInternal, ErrNotFound, isSentinel } from "../constants/errors";
import { clientIp } from "./clientIp";
import { getLogger } from "./logger";
import { hashPassword, verifyPassword } from "./password";
import {
  getClientIp,
  getQueuedCookies,
  getRequestId,
  getSessionUser,
  issueSessionCookie,
  revokeSessionCookie,
  runWithRequestContext,
} from "./requestContext";
import { created, fail, handleError, ok } from "./response";
import { revalidateTags, triggerRevalidate } from "./revalidate";

const reqWith = (headers: Record<string, string>) => new Request("http://x", { headers });

describe("response envelopes", () => {
  it("ok/created carry the standard {code,message,data} body", () => {
    expect(ok({ a: 1 })).toEqual({
      status: 200,
      body: { code: 200, message: "OK", data: { a: 1 } },
    });
    expect(created("x", "Made")).toEqual({
      status: 201,
      body: { code: 201, message: "Made", data: "x" },
    });
    expect(fail(404, "nope")).toEqual({
      status: 404,
      body: { code: 404, message: "nope", data: null },
    });
  });
  it("handleError maps sentinels to their code and unknowns to 500", () => {
    expect(handleError(ErrNotFound).status).toBe(404);
    // Silence the expected error log for the unknown-error path.
    const errSpy = vi.spyOn(getLogger(), "error").mockImplementation(() => getLogger());
    const boom = handleError(new Error("kaboom"));
    expect(boom.status).toBe(ErrInternal.code);
    expect(boom.body.message).toBe(ErrInternal.message);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe("error sentinels", () => {
  it("isSentinel discriminates", () => {
    expect(isSentinel(ErrNotFound)).toBe(true);
    expect(isSentinel({ code: 1 })).toBe(false);
    expect(isSentinel(null)).toBe(false);
  });
});

describe("clientIp", () => {
  afterEach(() => {
    env.trustProxy = false;
  });
  it("ignores client-controlled forwarded headers by default (TRUST_PROXY off)", () => {
    expect(clientIp(reqWith({ "x-forwarded-for": "1.2.3.4" }))).toBe("0.0.0.0");
    expect(clientIp(reqWith({ "x-real-ip": "9.9.9.9" }))).toBe("0.0.0.0");
  });
  it("prefers the first x-forwarded-for entry, then x-real-ip, when the proxy is trusted", () => {
    env.trustProxy = true;
    expect(clientIp(reqWith({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(clientIp(reqWith({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(reqWith({}))).toBe("0.0.0.0");
  });
});

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("s3cret");
    expect(hash).not.toContain("s3cret");
    expect(await verifyPassword(hash, "s3cret")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
    // Malformed hash never throws — resolves false.
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
});

// triggerRevalidate dynamic-imports next/cache; mock it so unit tests exercise the
// in-process revalidateTag fan-out without a Next request scope.
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

describe("triggerRevalidate", () => {
  afterEach(() => vi.restoreAllMocks());
  it("invalidates every tag in-process via next/cache revalidateTag", async () => {
    const { revalidateTag } = await import("next/cache");
    triggerRevalidate([revalidateTags.products, revalidateTags.product("abc")]);
    await new Promise((r) => setTimeout(r, 10)); // let the dynamic import resolve
    expect(vi.mocked(revalidateTag).mock.calls.map((c) => c[0])).toEqual([
      "products",
      "product:abc",
    ]);
  });
  it("is a no-op when there are no tags", async () => {
    const { revalidateTag } = await import("next/cache");
    vi.mocked(revalidateTag).mockClear();
    triggerRevalidate([]);
    await new Promise((r) => setTimeout(r, 10));
    expect(revalidateTag).not.toHaveBeenCalled();
  });
  it("swallows and logs a revalidation failure without throwing", async () => {
    const { revalidateTag } = await import("next/cache");
    vi.mocked(revalidateTag).mockImplementation(() => {
      throw new Error("no request scope");
    });
    const warn = vi.spyOn(getLogger(), "warn").mockImplementation(() => getLogger());
    expect(() => triggerRevalidate(["products"])).not.toThrow();
    await new Promise((r) => setTimeout(r, 10)); // let the .catch run
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("request context (AsyncLocalStorage)", () => {
  it("exposes session, request id and queued cookies inside a run", async () => {
    await runWithRequestContext(
      {
        session: { sub: "u1", username: "owner" },
        requestId: "req-1",
        cookies: [],
        clientIp: "10.1.2.3",
      },
      async () => {
        expect(getSessionUser()).toEqual({ sub: "u1", username: "owner" });
        expect(getRequestId()).toBe("req-1");
        expect(getClientIp()).toBe("10.1.2.3");
        issueSessionCookie("mg_session", "tok", 100);
        revokeSessionCookie("stale");
        const cookies = getQueuedCookies();
        expect(cookies).toHaveLength(2);
        expect(cookies[1]).toEqual({ name: "stale", value: "", maxAge: 0 });
      },
    );
  });
  it("returns safe defaults outside any run", () => {
    expect(getSessionUser()).toBeNull();
    expect(getRequestId()).toBe("-");
    expect(getClientIp()).toBeNull();
    expect(getQueuedCookies()).toEqual([]);
  });
});

describe("logger", () => {
  it("returns a memoised logger", () => {
    expect(getLogger()).toBe(getLogger());
  });
});
