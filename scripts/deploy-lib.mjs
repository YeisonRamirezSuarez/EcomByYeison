// Helpers shared by the deployment scripts (check-env, make-superadmin, stripe-webhook).
// Messages name a variable, never its value.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

export const REQUIRED = [
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  "NEXT_PUBLIC_SANITY_DATASET",
  "NEXT_PUBLIC_SANITY_API_VERSION",
  "SANITY_API_TOKEN",
  "SANITY_API_READ_TOKEN",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "EMAIL_ENCRYPTION_KEY",
  "NEXT_PUBLIC_BASE_URL",
];
export const SMTP = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"];
export const WEBHOOK_EVENT = "checkout.session.completed";

// The client's variables, kept apart from the terminal's own. Windows editors may add a BOM.
export function readEnvFile(path = ".env.local") {
  if (!existsSync(path)) throw new Error(`No existe el archivo ${path}`);
  return parseEnv(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

export function keyMode(value, kind) {
  if (value?.startsWith(`${kind}_test_`)) return "prueba";
  if (value?.startsWith(`${kind}_live_`)) return "real";
  return null;
}

// Both keys of a service must exist in the same mode; returns that mode or null.
function checkPair(errors, service, env, secretName, publicName) {
  const secret = keyMode(env[secretName], "sk");
  const pub = keyMode(env[publicName], "pk");
  if (env[secretName]?.trim() && !secret) errors.push(`${secretName} no parece una clave secreta de ${service} (sk_test_… o sk_live_…)`);
  if (env[publicName]?.trim() && !pub) errors.push(`${publicName} no parece una clave pública de ${service} (pk_test_… o pk_live_…)`);
  if (secret && pub && secret !== pub) errors.push(`${service}: ${secretName} está en modo ${secret} y ${publicName} en modo ${pub}`);
  return secret && secret === pub ? secret : null;
}

function isBaseUrl(value) {
  if (value.endsWith("/")) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost");
  } catch {
    return false;
  }
}

// Offline rules for a client's env file.
export function checkEnv(env) {
  const has = (name) => Boolean(env[name]?.trim());
  const errors = REQUIRED.filter((name) => !has(name)).map((name) => `Falta ${name}`);
  for (const name of REQUIRED) if (has(name) && /\s/.test(env[name])) errors.push(`${name} tiene espacios o saltos de línea`);
  const modes = {
    stripe: checkPair(errors, "Stripe", env, "STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    clerk: checkPair(errors, "Clerk", env, "CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  };
  if (has("STRIPE_WEBHOOK_SECRET") && !env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
    errors.push("STRIPE_WEBHOOK_SECRET debe empezar por whsec_");
  }
  if (has("NEXT_PUBLIC_BASE_URL") && !isBaseUrl(env.NEXT_PUBLIC_BASE_URL)) {
    errors.push("NEXT_PUBLIC_BASE_URL debe ser https://dominio (o http://localhost:3000), sin / al final");
  }
  if (has("EMAIL_ENCRYPTION_KEY") && env.EMAIL_ENCRYPTION_KEY.length < 32) {
    errors.push("EMAIL_ENCRYPTION_KEY debe tener al menos 32 caracteres");
  }
  if (has("NEXT_PUBLIC_SANITY_API_VERSION") && !/^\d{4}-\d{2}-\d{2}$/.test(env.NEXT_PUBLIC_SANITY_API_VERSION)) {
    errors.push("NEXT_PUBLIC_SANITY_API_VERSION debe ser una fecha como 2025-03-20");
  }
  for (const [name, path] of [["NEXT_PUBLIC_CLERK_SIGN_IN_URL", "/sign-in"], ["NEXT_PUBLIC_CLERK_SIGN_UP_URL", "/sign-up"]]) {
    if (has(name) && env[name] !== path) errors.push(`${name} debe ser ${path}`);
  }
  // Same rule as lib/mailer.ts: SMTP_HOST turns the env mailer on; port and from have defaults.
  if (has("SMTP_HOST")) {
    for (const name of ["SMTP_USER", "SMTP_PASSWORD"]) if (!has(name)) errors.push(`Con SMTP_HOST hace falta ${name}`);
  } else if (SMTP.some(has)) {
    errors.push("Falta SMTP_HOST (las demás SMTP_* no se usan sin ella)");
  }
  return { errors, modes };
}

export const webhookUrl = (base) => `${base.replace(/\/+$/, "")}/api/webhook`;

export const findWebhook = (endpoints, url) => endpoints.find((endpoint) => endpoint.url === url) ?? null;

// make:superadmin must change exactly one account.
export function pickSingleUser(users, email) {
  if (users.length === 0) throw new Error(`No hay ningún usuario con ${email}. Pide al dueño que se registre primero en la tienda.`);
  if (users.length > 1) throw new Error(`Hay ${users.length} usuarios con ${email}; no se cambió nada. Revísalos en el panel de Clerk.`);
  return users[0];
}

// Types holding personal or secret data; their ids carry a dot, which Sanity hides from tokenless reads.
export const PRIVATE_TYPES = ["address", "order", "subscriber", "campaign", "smtpSettings"];

export function publicPrivateDocs(count) {
  if (!count) return null;
  return `Sanity muestra sin token ${count} documento(s) que deberían ser privados (direcciones, pedidos, suscriptores, campañas o correo); revísalos en /studio`;
}
