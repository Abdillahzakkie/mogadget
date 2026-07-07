import { describe, it, expect, vi, afterEach } from "vitest";
import { ok, created, fail, handleError } from "./response";
import { ErrNotFound, ErrInternal, isSentinel } from "../constants/errors";
import { clientIp } from "./clientIp";
import { hashPassword, verifyPassword } from "./password";
import { triggerRevalidate, revalidateTags } from "./revalidate";
import {
  runWithRequestContext,
  getSessionUser,
  getRequestId,
  issueSessionCookie,
  revokeSessionCookie,
  getQueuedCookies,
} from "./requestContext";
import { getLogger } from "./logger";

const reqWith = (headers: Record<string, string>) => new Request("http://x", { headers });

describe("response envelopes", () => {
  it("ok/created carry the standard {code,message,data} body", () => {
    expect(ok({ a: 1 })).toEqual({ status: 200, body: { code: 200, message: "OK", data: { a: 1 } } });
    expect(created("x", "Made")).toEqual({ status: 201, body: { code: 201, message: "Made", data: "x" } });
    expect(fail(404, "nope")).toEqual({ status: 404, body: { code: 404, message: "nope", data: null } });
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
  it("prefers the first x-forwarded-for entry", () => {
    expect(clientIp(reqWith({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip then a default", () => {
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

describe("triggerRevalidate", () => {
  afterEach(() => vi.restoreAllMocks());
  it("posts the tags + secret to the web /revalidate webhook", () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    triggerRevalidate([revalidateTags.products, revalidateTags.product("abc")]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/revalidate$/);
    const body = JSON.parse((init as { body: string }).body);
    expect(body.tags).toEqual(["products", "product:abc"]);
    expect(typeof body.secret).toBe("string");
    vi.unstubAllGlobals();
  });
  it("is a no-op when there are no tags", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    triggerRevalidate([]);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("swallows and logs a webhook failure without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("web down")));
    const warn = vi.spyOn(getLogger(), "warn").mockImplementation(() => getLogger());
    expect(() => triggerRevalidate(["products"])).not.toThrow();
    await new Promise((r) => setTimeout(r, 10)); // let the .catch run
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe("request context (AsyncLocalStorage)", () => {
  it("exposes session, request id and queued cookies inside a run", async () => {
    await runWithRequestContext(
      { session: { sub: "u1", username: "owner" }, requestId: "req-1", cookies: [] },
      async () => {
        expect(getSessionUser()).toEqual({ sub: "u1", username: "owner" });
        expect(getRequestId()).toBe("req-1");
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
    expect(getQueuedCookies()).toEqual([]);
  });
});

describe("logger", () => {
  it("returns a memoised logger", () => {
    expect(getLogger()).toBe(getLogger());
  });
});
