import { NextRequest } from "next/server";
import { applyUnsubscribe } from "@/lib/unsubscribe";

// One-click unsubscribe (RFC 8058): Gmail and Yahoo POST here from the List-Unsubscribe header.
export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const ok = await applyUnsubscribe(params.get("s"), params.get("t"));
  return new Response(null, { status: ok ? 200 : 400 });
}
