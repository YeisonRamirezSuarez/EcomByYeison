import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { backendClient } from "@/sanity/lib/backendClient";
import stripe from "@/lib/stripe";
import { sendInvoiceEmail } from "@/lib/email";
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
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    // Verify user is admin
    if (!isAdminEmail(userEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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
      `*[_id == $orderId][0]{ email, customerName, orderNumber, themeName, invoice }`,
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
        const invoice = await stripe.invoices.retrieve(orderBefore.invoice.id);

        if (invoice.hosted_invoice_url) {
          await sendInvoiceEmail(
            orderBefore.email,
            orderBefore.customerName,
            orderBefore.orderNumber,
            invoice.hosted_invoice_url,
            orderBefore.invoice.number || orderBefore.invoice.id,
            orderBefore.themeName
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
