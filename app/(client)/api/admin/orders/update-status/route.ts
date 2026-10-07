import { getActor } from "@/lib/roles";
import { can } from "@/lib/permissions";
import { backendClient } from "@/sanity/lib/backendClient";
import { sendInvoiceEmail } from "@/lib/email";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { NextRequest, NextResponse } from "next/server";

// Valid order status values.
const validStatuses = [
  "pending",
  "processing",
  "paid",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export async function PATCH(req: NextRequest) {
  try {
    const actor = await getActor();
    if (!actor || !can(actor.role, "pedidos")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { orderId, newStatus } = await req.json();

    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Fetch the order first (parameterized query — never interpolate user input
    // into GROQ). Only the fields needed for the invoice email are projected.
    const orderBefore = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]{ email, customerName, orderNumber, invoice, locale }`,
      { orderId }
    );

    if (!orderBefore) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updatedOrder = await backendClient
      .patch(orderId)
      .set({ status: newStatus })
      .commit();

    // Send invoice email if status is delivered
    if (newStatus === "delivered" && orderBefore?.invoice?.id) {
      try {
        // Loaded only here: status changes must work even without STRIPE_SECRET_KEY.
        const { default: stripe } = await import("@/lib/stripe");
        const invoice = await stripe.invoices.retrieve(orderBefore.invoice.id);

        if (invoice.hosted_invoice_url) {
          // Orders from before the language was saved use the store's main language.
          const locale = orderBefore.locale === "en" || orderBefore.locale === "es" ? orderBefore.locale : (await getSiteSettings()).primary;
          await sendInvoiceEmail(
            orderBefore.email,
            orderBefore.customerName,
            orderBefore.orderNumber,
            invoice.hosted_invoice_url,
            orderBefore.invoice.number || orderBefore.invoice.id,
            locale
          );
        }
      } catch (emailError) {
        // Don't fail the status update if the email fails.
        console.error("[admin/orders/update-status] invoice email failed:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    // Log the full error server-side, but never leak it to the client.
    console.error("[admin/orders/update-status] error:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
