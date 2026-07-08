import { env } from "../constants/environments";

// Next route handlers expose no raw socket, so header-based resolution is all we have.
// Forwarded headers are client-controlled: honoring them unconditionally lets a caller
// rotate X-Forwarded-For to dodge per-IP rate limits (e.g. unlimited login attempts).
// Trust them only when TRUST_PROXY=true — i.e. the app is reachable solely through a
// proxy/LB that overwrites these headers. With TRUST_PROXY=false the key degrades to a
// constant (globally-shared limits): a known, accepted trade-off for dev/direct exposure
// — production deploys behind a proxy with TRUST_PROXY=true.
export function clientIp(req: Request): string {
  if (env.trustProxy) {
    const xf = req.headers.get("x-forwarded-for");
    if (xf) return xf.split(",")[0]!.trim();
    const xr = req.headers.get("x-real-ip");
    if (xr) return xr;
  }
  return "0.0.0.0";
}
