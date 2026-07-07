import { Hono, type Context } from "hono";
import { readLocalBlob } from "@mogadget/core";
import { runRoute } from "./lib/adapter";
import { manifest } from "./routes/manifest";

export function createApp(): Hono {
  const app = new Hono();
  app.get("/health", (c) => c.json({ code: 200, message: "OK", data: { up: true } }));

  // Local storage-driver static serve (binary; not a JSON API route, so it bypasses the adapter).
  app.get("/uploads/*", async (c) => {
    const key = c.req.path.replace(/^\/uploads\//, "");
    const blob = await readLocalBlob(key);
    if (!blob) return c.json({ code: 404, message: "Not found", data: null }, 404);
    return new Response(blob.bytes, {
      headers: {
        "content-type": blob.contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  });

  for (const r of manifest) {
    const bind = (c: Context) => runRoute(c, r.handler);
    if (r.method === "GET") app.get(r.path, bind);
    else if (r.method === "POST") app.post(r.path, bind);
    else if (r.method === "PATCH") app.patch(r.path, bind);
    else if (r.method === "PUT") app.put(r.path, bind);
    else app.delete(r.path, bind);
  }
  return app;
}
