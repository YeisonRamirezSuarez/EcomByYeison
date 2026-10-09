// Creates the Stripe webhook that turns paid checkouts into orders and records refunds, in the key's
// mode (test or live). An existing webhook gets the events it lacks.
// Run: npm run stripe:webhook -- [archivo .env]
import Stripe from "stripe";
import { findWebhook, keyMode, missingEvents, readEnvFile, stripeErrorMessage, webhookUrl, WEBHOOK_EVENTS } from "./deploy-lib.mjs";

try {
  const env = readEnvFile(process.argv[2]);
  const mode = keyMode(env.STRIPE_SECRET_KEY, "sk");
  if (!mode) throw new Error("STRIPE_SECRET_KEY no parece una clave secreta de Stripe (sk_test_… o sk_live_…)");
  if (!env.NEXT_PUBLIC_BASE_URL?.startsWith("https://")) {
    throw new Error("NEXT_PUBLIC_BASE_URL debe ser el dominio público de la tienda (https://…): Stripe no llega a localhost");
  }
  const url = webhookUrl(env.NEXT_PUBLIC_BASE_URL);
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const existing = findWebhook((await stripe.webhookEndpoints.list({ limit: 100 })).data, url);
  if (existing) {
    console.log(`Ya existe un webhook en modo ${mode} hacia ${url} (${existing.id}); no se creó otro.`);
    const missing = missingEvents(existing);
    if (missing.length) {
      await stripe.webhookEndpoints.update(existing.id, { enabled_events: [...existing.enabled_events, ...missing] });
      console.log(`Se agregaron al webhook los eventos: ${missing.join(", ")}.`);
    }
    console.log("Stripe no vuelve a mostrar su secreto. Si no lo tienes: Stripe → Developers → Webhooks → ese endpoint → Roll secret, y copia el nuevo a STRIPE_WEBHOOK_SECRET.");
  } else {
    const endpoint = await stripe.webhookEndpoints.create({ url, enabled_events: WEBHOOK_EVENTS, description: "Pedidos de la tienda" });
    console.log(`Webhook creado en modo ${mode}: ${url}`);
    console.log("Copia este secreto a STRIPE_WEBHOOK_SECRET (Stripe no lo vuelve a mostrar):");
    console.log(endpoint.secret);
  }
} catch (error) {
  // Stripe errors carry a `type` like "StripeAuthenticationError"; ours are plain messages.
  console.error(error.type?.startsWith("Stripe") ? stripeErrorMessage(error) : error.message);
  process.exit(1);
}
