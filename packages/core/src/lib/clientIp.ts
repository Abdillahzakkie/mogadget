import { env } from "../constants/environments";

// Forwarded headers are client-controlled: honoring them unconditionally lets a caller rotate
// X-Forwarded-For to dodge per-IP rate limits (e.g. unlimited login attempts). Trust them only
// when TRUST_PROXY=true — i.e. the API is reachable solely through a proxy/LB that overwrites
// these headers. Otherwise use the transport-level socket address the adapter observed.
export function clientIp(req: Request, socketIp?: string): string {
  if (env.trustProxy) {
    const xf = req.headers.get("x-forwarded-for");
    if (xf) return xf.split(",")[0]!.trim();
    const xr = req.headers.get("x-real-ip");
    if (xr) return xr;
  }
  return socketIp || "0.0.0.0";
}
