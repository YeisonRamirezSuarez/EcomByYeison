"use server";

import { Address } from "@/sanity.types";
import { urlFor } from "@/sanity/lib/image";
import { CartItem } from "@/store";
import Stripe from "stripe";
import { pickText, resolveLocale } from "@/lib/localize";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { backendClient } from "@/sanity/lib/backendClient";
import { checkoutLines, type CheckoutProduct } from "@/lib/checkout";
import type { ActionResult } from "@/lib/actionResult";
import { t } from "@/lib/i18n";

export interface Metadata {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  clerkUserId?: string;
  address?: Address | null;
  locale?: "es" | "en";
}

export interface GroupedCartItems {
  product: CartItem["product"];
  quantity: number;
}

export async function createCheckoutSession(
  items: GroupedCartItems[],
  metadata: Metadata
): Promise<ActionResult<string>> {
  // Store settings never throw (defaults when Sanity is down). The browser's language counts only if the store offers it.
  const settings = await getSiteSettings();
  const locale = resolveLocale(metadata.locale, settings);
  try {
    // Only ids and quantities come from the browser: name, price and photo are read from Sanity.
    const wanted = (items ?? []).map((item) => ({ id: String(item?.product?._id ?? ""), quantity: item?.quantity }));
    const products = await backendClient.fetch<CheckoutProduct[]>(
      `*[_type == "product" && _id in $ids && archived != true]{ _id, name, nameEn, price, description, descriptionEn, images }`,
      { ids: wanted.map((w) => w.id) },
      { perspective: "published", useCdn: false, cache: "no-store" }
    );
    const checked = checkoutLines(wanted, products);
    if (!checked.ok) return { ok: false, error: t(locale, "checkoutUnavailable") };
    // Lazy: lib/stripe throws at import when STRIPE_SECRET_KEY is missing.
    const { default: stripe } = await import("@/lib/stripe");

    // Retrieve existing customer or create a new one
    const customers = await stripe.customers.list({
      email: metadata.customerEmail,
      limit: 1,
    });
    const customerId = customers?.data?.length > 0 ? customers.data[0].id : "";
    // Store currency comes from the server, never from the browser.
    const { currency } = settings;

    const sessionPayload: Stripe.Checkout.SessionCreateParams = {
      locale,
      metadata: {
        orderNumber: metadata.orderNumber,
        customerName: metadata.customerName,
        customerEmail: metadata.customerEmail,
        clerkUserId: metadata.clerkUserId!,
        address: JSON.stringify(metadata.address),
        locale,
      },
      mode: "payment",
      allow_promotion_codes: true,
      payment_method_types: ["card"],
      invoice_creation: {
        enabled: true,
      },
      success_url: `${
        process.env.NEXT_PUBLIC_BASE_URL
      }/success?session_id={CHECKOUT_SESSION_ID}&orderNumber=${metadata.orderNumber}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cart`,
      line_items: checked.lines.map(({ product, quantity }) => ({
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: Math.round(product.price! * 100),
          product_data: {
            name: pickText(product.name, product.nameEn, locale) || t(locale, "checkoutUnknownProduct"),
            description: pickText(product.description, product.descriptionEn, locale) || undefined,
            metadata: { id: product._id },
            images: product.images?.length ? [urlFor(product.images[0] as Parameters<typeof urlFor>[0]).url()] : undefined,
          },
        },
        quantity,
      })),
    };
    if (customerId) {
      sessionPayload.customer = customerId;
    } else {
      sessionPayload.customer_email = metadata.customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return { ok: true, data: session.url };
  } catch (error) {
    console.error("Error creating Checkout Session", error);
    return { ok: false, error: t(locale, "checkoutFailed") };
  }
}
