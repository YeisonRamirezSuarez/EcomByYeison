import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getMyOrderCount } from "@/sanity/queries";

// Header badge, loaded by the browser so pages don't wait for this query.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ count: await getMyOrderCount(userId) });
}
