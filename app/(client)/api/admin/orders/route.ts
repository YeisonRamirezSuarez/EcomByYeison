import { getActor } from "@/lib/roles";
import { can } from "@/lib/permissions";
import { ADMIN_ORDERS_QUERY } from "@/sanity/queries/query";
import { backendClient } from "@/sanity/lib/backendClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor || !can(actor.role, "pedidos")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Use backendClient directly to bypass caching
    const orders = await backendClient.fetch(ADMIN_ORDERS_QUERY);
    
    return NextResponse.json(orders || []);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
