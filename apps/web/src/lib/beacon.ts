import type { TClickChannel } from "@mogadget/contracts/types";

// Best-effort click analytics fired the instant a chat CTA is tapped — BEFORE navigation,
// so the count survives the page unload. sendBeacon is the reliable primitive for this;
// keepalive fetch is the fallback. Never blocks or throws into the click handler.
export function fireClickBeacon(slug: string, channel: TClickChannel): void {
  const path = `/api/products/${encodeURIComponent(slug)}/click`;
  const body = JSON.stringify({ channel });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(path, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* analytics are best-effort — never interrupt the sale */
  }
}
