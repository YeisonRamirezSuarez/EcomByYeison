import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { backendClient } from "@/sanity/lib/backendClient";
import stripe from "@/lib/stripe";
import { sendInvoiceEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    console.log(`🔴 [PATCH /api/admin/orders/update-status] Request received`);
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    console.log(`👤 [PATCH] User: ${userEmail}`);

    // Verify user is admin
    if (!isAdminEmail(userEmail)) {
      console.log(`❌ [PATCH] Unauthorized - ${userEmail} is not an admin`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { orderId, newStatus } = await req.json();
    console.log(`📝 [PATCH] Payload - orderId: ${orderId}, newStatus: ${newStatus}`);

    if (!orderId || !newStatus) {
      console.log(`❌ [PATCH] Missing required fields`);
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Valid status values
    const validStatuses = [
      "pending",
      "processing",
      "paid",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(newStatus)) {
      console.log(`❌ [PATCH] Invalid status: ${newStatus}`);
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Fetch order before updating
    console.log(`🔍 [PATCH] Fetching order before update...`);
    const orderBefore = await backendClient.fetch(
      `*[_id == "${orderId}"][0]`
    );
    console.log(`📊 [PATCH] Order BEFORE - Status: ${orderBefore?.status}, OrderNumber: ${orderBefore?.orderNumber}`);
    
    console.log(`🔨 [PATCH] Updating order in Sanity to status: ${newStatus}...`);
    const updatedOrder = await backendClient
      .patch(orderId)
      .set({ status: newStatus })
      .commit();
    
    console.log(`✅ [PATCH] Sanity commit completed`);
    console.log(`📊 [PATCH] Order AFTER commit - Status: ${updatedOrder?.status}, OrderNumber: ${updatedOrder?.orderNumber}, ID: ${updatedOrder?._id}`);
    
    // Verify immediately after commit by fetching again
    console.log(`🔍 [PATCH] Verifying change in Sanity immediately after commit...`);
    const verifyOrder = await backendClient.fetch(
      `*[_id == "${orderId}"][0]{_id, orderNumber, status}`
    );
    console.log(`📊 [PATCH] Verification fetch result - Status: ${verifyOrder?.status}, OrderNumber: ${verifyOrder?.orderNumber}`);
    
    if (verifyOrder?.status !== newStatus) {
      console.error(`❌ [PATCH] CRITICAL: Status mismatch! Expected ${newStatus}, but Sanity has ${verifyOrder?.status}`);
      console.error(`❌ [PATCH] updatedOrder object status: ${updatedOrder?.status}`);
      console.error(`❌ [PATCH] Sanity database status: ${verifyOrder?.status}`);
    } else {
      console.log(`✅ [PATCH] Status verified correctly in Sanity: ${newStatus}`);
    }

    // Send invoice email if status is delivered
    if (newStatus === "delivered" && orderBefore?.invoice?.id) {
      try {
        console.log(`📧 [PATCH] Order delivered - sending invoice email...`);
        // Get the invoice URL from Stripe
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
          console.log(`✅ [PATCH] Invoice email sent to ${orderBefore.email}`);
        } else {
          console.warn(`⚠️ [PATCH] No hosted invoice URL available`);
        }
      } catch (emailError) {
        console.error(`❌ [PATCH] Error sending invoice email:`, emailError);
        // Don't fail the status update if email fails
      }
    }

    console.log(`✅ [PATCH] Returning updated order to client`);
    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("❌ [PATCH] Error updating order status:", error);
    return NextResponse.json(
      { error: `Failed to update order status: ${error}` },
      { status: 500 }
    );
  }
}
