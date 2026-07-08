export const runtime = "nodejs";

import { register } from "prom-client";

// Prometheus scrape target (Managerenta pattern). The histograms in src/server/metrics
// register against prom-client's default registry, exposed here.
export async function GET() {
  return new Response(await register.metrics(), {
    headers: { "content-type": register.contentType },
  });
}
