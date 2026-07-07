import { describe, it, expect, vi, afterEach } from "vitest";
import { fireClickBeacon } from "./beacon";

describe("fireClickBeacon", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses navigator.sendBeacon to the click endpoint when available", () => {
    const sendBeacon = vi.fn((_url: string, _data?: unknown) => true);
    vi.stubGlobal("navigator", { sendBeacon });
    fireClickBeacon("iphone-13", "whatsapp");
    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(sendBeacon.mock.calls[0]![0]).toBe("/api/products/iphone-13/click");
  });

  it("falls back to a keepalive fetch when sendBeacon is absent", () => {
    vi.stubGlobal("navigator", {});
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    fireClickBeacon("ps5", "instagram");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/products/ps5/click");
    expect((init as { method: string }).method).toBe("POST");
    expect(JSON.parse((init as { body: string }).body).channel).toBe("instagram");
  });

  it("never throws even if the transport errors", () => {
    vi.stubGlobal("navigator", {
      sendBeacon: () => {
        throw new Error("boom");
      },
    });
    expect(() => fireClickBeacon("x", "whatsapp")).not.toThrow();
  });
});
