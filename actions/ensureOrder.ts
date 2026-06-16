"use server";

import { createOrderFromStripeSession } from "@/lib/orders";

/**
 * Safety net for the /success page: if the Stripe webhook hasn't created the
 * order yet (or failed/misconfigured), create it from the checkout session.
 *
 * Idempotent — does nothing if the webhook already created the order, and only
 * creates orders for sessions Stripe reports as paid.
 */
export async function ensureOrder(sessionId: string): Promise<void> {
  if (!sessionId) return;
  try {
    await createOrderFromStripeSession(sessionId);
  } catch (error) {
    // Best-effort: the webhook remains the primary path and will retry.
    console.error("[ensureOrder] reconciliation failed:", error);
  }
}
