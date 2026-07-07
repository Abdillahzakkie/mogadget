import { Hono, type Context } from "hono";
import { runRoute } from "./lib/adapter";
import { manifest } from "./routes/manifest";

export function createApp(): Hono {
  const app = new Hono();
  app.get("/health", (c) => c.json({ code: 200, message: "OK", data: { up: true } }));
  for (const r of manifest) {
    const bind = (c: Context) => runRoute(c, r.handler);
    if (r.method === "GET") app.get(r.path, bind);
    else if (r.method === "POST") app.post(r.path, bind);
    else if (r.method === "PATCH") app.patch(r.path, bind);
    else app.delete(r.path, bind);
  }
  return app;
}
