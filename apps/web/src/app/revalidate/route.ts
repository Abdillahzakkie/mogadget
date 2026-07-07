import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

// On-demand ISR webhook. The API service pokes this after every product mutation with the
// affected cache tags (see core/lib/revalidate). Secret-gated; lives outside /api so the
// Next → API rewrite doesn't shadow it.
const SECRET = process.env.REVALIDATE_SECRET ?? "dev-revalidate-secret-change-me";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { secret?: string; tags?: unknown } | null;
  if (!body || body.secret !== SECRET) {
    return NextResponse.json({ code: 401, message: "Unauthorized", data: null }, { status: 401 });
  }
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string" && !!t) : [];
  for (const tag of tags) revalidateTag(tag);
  return NextResponse.json({ code: 200, message: "OK", data: { revalidated: tags } });
}
