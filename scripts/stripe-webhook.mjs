// Creates the Stripe webhook that turns paid checkouts into orders, in the key's mode (test or live).
// Run: npm run stripe:webhook -- [archivo .env]
import Stripe from "stripe";
import { findWebhook, keyMode, readEnvFile, webhookUrl, WEBHOOK_EVENT } from "./deploy-lib.mjs";

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
    console.log("Stripe no vuelve a mostrar su secreto. Si no lo tienes: Stripe → Developers → Webhooks → ese endpoint → Roll secret, y copia el nuevo a STRIPE_WEBHOOK_SECRET.");
  } else {
    const endpoint = await stripe.webhookEndpoints.create({ url, enabled_events: [WEBHOOK_EVENT], description: "Pedidos de la tienda" });
    console.log(`Webhook creado en modo ${mode}: ${url}`);
    console.log("Copia este secreto a STRIPE_WEBHOOK_SECRET (Stripe no lo vuelve a mostrar):");
    console.log(endpoint.secret);
  }
} catch (error) {
  // Stripe's own messages can echo part of the key, so only its status is shown.
  console.error(error.statusCode ? `Stripe respondió ${error.statusCode}: revisa STRIPE_SECRET_KEY` : error.message);
  process.exit(1);
}
