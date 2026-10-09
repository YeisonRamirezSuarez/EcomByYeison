import stripe from "@/lib/stripe";
import { createOrderFromStripeSession, recordRefund } from "@/lib/orders";
import { reportError } from "@/lib/alerts";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "No Signature found for stripe" },
      { status: 400 }
    );
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook secret is not set" },
      { status: 400 }
    );
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (error) {
    // Log full detail server-side; return a generic message to the caller.
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      // Idempotent: safe under Stripe's at-least-once delivery / retries.
      await createOrderFromStripeSession(session.id);
    } catch (error) {
      // Return 500 so Stripe retries — safe to retry because order creation is
      // idempotent (deterministic id + existing-order check).
      console.error("Error creating order in sanity:", error);
      // Paid in Stripe but no order yet: the most urgent thing to hear about.
      await reportError("Webhook de Stripe: no se pudo crear el pedido (Stripe reintentará)", error);
      return NextResponse.json(
        { error: "Error processing order" },
        { status: 500 }
      );
    }
  }
  if (event.type === "charge.refunded") {
    try {
      await recordRefund(event.data.object as Stripe.Charge);
    } catch (error) {
      // 500 so Stripe retries; the patch only ever raises the refunded amount.
      console.error("Error recording refund in sanity:", error);
      await reportError("Webhook de Stripe: no se pudo registrar el reembolso", error);
      return NextResponse.json({ error: "Error processing refund" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
