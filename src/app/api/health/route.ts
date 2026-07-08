export const runtime = "nodejs";

import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ code: 200, message: "OK", data: { up: true } });
}
