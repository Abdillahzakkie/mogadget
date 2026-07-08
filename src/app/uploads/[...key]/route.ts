export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readLocalBlob } from "@/server";

// Local storage-driver static serve (binary; not a JSON API route, so it bypasses
// withApiHandler). Public image URLs are /uploads/<key> — preserved from the Hono app.
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const blob = await readLocalBlob(key.join("/"));
  if (!blob) {
    return NextResponse.json({ code: 404, message: "Not found", data: null }, { status: 404 });
  }
  return new Response(new Uint8Array(blob.bytes), {
    headers: {
      "content-type": blob.contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
