import "server-only";

import stripe from "@/lib/stripe";
import { backendClient } from "@/sanity/lib/backendClient";
import { sendOrderConfirmationEmail } from "@/lib/email";
import type { Metadata } from "@/actions/createCheckoutSession";
import Stripe from "stripe";

type OrderMetadata = Metadata & { address?: string; themeName?: string };

// Sanity has no unique constraints, so idempotency is enforced in code:
// a deterministic document id derived from the Stripe session means a duplicate
// delivery hits an existing id (409) instead of creating a second order.
const orderDocIdFor = (sessionId: string) => `order.${sessionId}`;

function isConflictError(err: unknown): boolean {
  const e = err as { statusCode?: number; response?: { statusCode?: number } };
  return e?.statusCode === 409 || e?.response?.statusCode === 409;
}

/**
 * Create the Sanity order for a paid Stripe Checkout session.
 *
 * Idempotent and safe to call multiple times (Stripe webhook retries, at-least-
 * once delivery, the /success page reconciliation): stock is decremented and the
 * confirmation email is sent ONLY on the first successful creation.
 *
 * Returns `{ created: false }` when the order already existed or the session is
 * not paid; `{ created: true }` the first time the order is written.
 */
export async function createOrderFromStripeSession(
  sessionId: string
): Promise<{ created: boolean }> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price.product"],
  });

  // Only record orders for sessions that actually paid — this also makes the
  // /success reconciliation safe to call with any session id.
  if (session.payment_status !== "paid") {
    return { created: false };
  }

  const orderDocId = orderDocIdFor(session.id);

  // Fast path: already processed. Check both the deterministic id (new orders)
  // and the session-id field (orders created before this change).
  const existing =
    (await backendClient.getDocument(orderDocId)) ??
    (await backendClient.fetch(
      `*[_type == "order" && stripeCheckoutSessionId == $id][0]{ _id }`,
      { id: session.id }
    ));
  if (existing) return { created: false };

  const invoice = session.invoice
    ? await stripe.invoices.retrieve(session.invoice as string)
    : null;

  const {
    orderNumber,
    customerName,
    customerEmail,
    clerkUserId,
    address,
    themeName,
  } = session.metadata as unknown as OrderMetadata;
  const parsedAddress = address ? JSON.parse(address) : null;

  const lineItems =
    session.line_items?.data ??
    (
      await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ["data.price.product"],
      })
    ).data;

  const sanityProducts = [];
  const stockUpdates = [];
  const productsForEmail = [];

  for (const item of lineItems) {
    const product = item.price?.product as Stripe.Product | undefined;
    const productId = product?.metadata?.id;
    const quantity = item?.quantity || 0;
    const productName = product?.name || "Product";
    const price = item.price?.unit_amount ? item.price.unit_amount / 100 : 0;

    if (!productId) continue;

    let productImage = "";
    try {
      const sanityProduct = await backendClient.fetch(
        `*[_id == $productId][0]{ image }`,
        { productId }
      );
      if (sanityProduct?.image) {
        productImage = `https://cdn.sanity.io/images/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/${process.env.NEXT_PUBLIC_SANITY_DATASET}/${sanityProduct.image.asset._ref
          .replace(/^image-/, "")
          .replace(/-[a-z]+$/, "")}.jpg?w=300&h=300&fit=crop`;
      }
    } catch (error) {
      console.warn(`Could not fetch image for product ${productId}:`, error);
    }

    sanityProducts.push({
      _key: crypto.randomUUID(),
      product: { _type: "reference", _ref: productId },
      quantity,
    });
    stockUpdates.push({ productId, quantity });
    productsForEmail.push({ name: productName, quantity, price, image: productImage });
  }

  const stripeCustomerId =
    (typeof session.customer === "string"
      ? session.customer
      : session.customer?.id) || customerEmail;

  // Create with the deterministic id. A concurrent delivery that already created
  // the order makes this throw 409 — caught below as an idempotent no-op so stock
  // and email are never doubled.
  try {
    await backendClient.create({
      _id: orderDocId,
      _type: "order",
      orderNumber,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      customerName,
      stripeCustomerId,
      clerkUserId,
      email: customerEmail,
      currency: session.currency,
      amountDiscount: session.total_details?.amount_discount
        ? session.total_details.amount_discount / 100
        : 0,
      products: sanityProducts,
      totalPrice: session.amount_total ? session.amount_total / 100 : 0,
      status: "paid",
      orderDate: new Date().toISOString(),
      themeName: themeName || "emerald",
      invoice: invoice
        ? {
            id: invoice.id,
            number: invoice.number,
            hosted_invoice_url: invoice.hosted_invoice_url,
          }
        : null,
      address: parsedAddress
        ? {
            state: parsedAddress.state,
            zip: parsedAddress.zip,
            city: parsedAddress.city,
            address: parsedAddress.address,
            name: parsedAddress.name,
          }
        : null,
    });
  } catch (err) {
    if (isConflictError(err)) return { created: false };
    throw err;
  }

  // First creation only.
  await updateStockLevels(stockUpdates);

  try {
    await sendOrderConfirmationEmail(
      customerEmail,
      customerName,
      orderNumber,
      session.amount_total ? session.amount_total / 100 : 0,
      productsForEmail,
      invoice?.hosted_invoice_url || undefined,
      themeName
    );
  } catch (error) {
    console.error("❌ Error sending confirmation email:", error);
    // Don't fail order creation if the email fails.
  }

  return { created: true };
}

async function updateStockLevels(
  stockUpdates: { productId: string; quantity: number }[]
) {
  for (const { productId, quantity } of stockUpdates) {
    await decrementStock(productId, quantity);
  }
}

/**
 * Decrement a product's stock with optimistic concurrency control.
 *
 * Plain read-then-set loses updates when two orders for the same product are
 * processed at once (both read the same stock and both write stock-qty, so one
 * decrement is lost → oversell). `ifRevisionId` makes the write fail (409) if the
 * document changed since we read it; we then re-read and retry, which serializes
 * concurrent decrements. Stock is clamped at 0.
 */
async function decrementStock(
  productId: string,
  quantity: number,
  attempt = 0
): Promise<void> {
  const MAX_ATTEMPTS = 5;
  try {
    const product = await backendClient.getDocument(productId);
    if (!product || typeof product.stock !== "number") {
      console.warn(`Product with ID ${productId} not found or stock is invalid.`);
      return;
    }
    const newStock = Math.max(product.stock - quantity, 0);
    await backendClient
      .patch(productId)
      .ifRevisionId(product._rev)
      .set({ stock: newStock })
      .commit();
  } catch (error) {
    // Revision mismatch: another order changed stock first — re-read and retry.
    if (isConflictError(error) && attempt < MAX_ATTEMPTS - 1) {
      return decrementStock(productId, quantity, attempt + 1);
    }
    console.error(`Failed to update stock for product ${productId}:`, error);
  }
}
