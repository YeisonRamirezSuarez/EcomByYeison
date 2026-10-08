// Checks a client's env file before deploying. Never prints a key's value.
// Run: npm run check:env -- [archivo .env] [--online]   ·   self-test: npm run check:env -- --self-test
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Stripe from "stripe";
import { checkEnv, findWebhook, readEnvFile, webhookUrl, WEBHOOK_EVENT } from "./deploy-lib.mjs";

const args = process.argv.slice(2);

if (args.includes("--self-test")) {
  const ok = {
    NEXT_PUBLIC_SANITY_PROJECT_ID: "abc123",
    NEXT_PUBLIC_SANITY_DATASET: "production",
    NEXT_PUBLIC_SANITY_API_VERSION: "2025-03-20",
    SANITY_API_TOKEN: "escritura",
    SANITY_API_READ_TOKEN: "lectura",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_x",
    CLERK_SECRET_KEY: "sk_live_x",
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
    STRIPE_SECRET_KEY: "sk_test_x",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
    STRIPE_WEBHOOK_SECRET: "whsec_x",
    EMAIL_ENCRYPTION_KEY: "k".repeat(32),
    NEXT_PUBLIC_BASE_URL: "https://tienda.com",
  };
  const problems = (patch) => checkEnv({ ...ok, ...patch }).errors;

  // A complete file passes; Stripe in test mode with Clerk live is the normal test phase
  assert.deepEqual(checkEnv(ok), { errors: [], modes: { stripe: "prueba", clerk: "real" } });
  assert.equal(checkEnv({ ...ok, STRIPE_SECRET_KEY: "sk_live_x", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_x" }).modes.stripe, "real");

  assert.deepEqual(problems({ SANITY_API_READ_TOKEN: undefined }), ["Falta SANITY_API_READ_TOKEN"]);
  assert.deepEqual(problems({ SANITY_API_TOKEN: "  " }), ["Falta SANITY_API_TOKEN"]);
  assert.deepEqual(problems({ STRIPE_SECRET_KEY: "sk_live_x" }), [
    "Stripe: STRIPE_SECRET_KEY está en modo real y NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY en modo prueba",
  ]);
  assert.deepEqual(problems({ CLERK_SECRET_KEY: "clave" }), [
    "CLERK_SECRET_KEY no parece una clave secreta de Clerk (sk_test_… o sk_live_…)",
  ]);
  assert.deepEqual(problems({ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "sk_test_x" }), [
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no parece una clave pública de Stripe (pk_test_… o pk_live_…)",
  ]);
  assert.deepEqual(problems({ STRIPE_WEBHOOK_SECRET: "x" }), ["STRIPE_WEBHOOK_SECRET debe empezar por whsec_"]);
  const BASE = "NEXT_PUBLIC_BASE_URL debe ser https://dominio (o http://localhost:3000), sin / al final";
  for (const base of ["http://tienda.com", "https://tienda.com/", "tienda.com", "ftp://tienda.com"]) {
    assert.deepEqual(problems({ NEXT_PUBLIC_BASE_URL: base }), [BASE], base);
  }
  assert.deepEqual(problems({ NEXT_PUBLIC_BASE_URL: "http://localhost:3000" }), []);
  assert.deepEqual(problems({ EMAIL_ENCRYPTION_KEY: "k".repeat(31) }), ["EMAIL_ENCRYPTION_KEY debe tener al menos 32 caracteres"]);
  assert.deepEqual(problems({ NEXT_PUBLIC_SANITY_API_VERSION: "2025-3-20" }), [
    "NEXT_PUBLIC_SANITY_API_VERSION debe ser una fecha como 2025-03-20",
  ]);
  assert.deepEqual(problems({ NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/login" }), ["NEXT_PUBLIC_CLERK_SIGN_IN_URL debe ser /sign-in"]);

  // SMTP_* as lib/mailer.ts uses them: host + user + password; port and from are optional
  assert.deepEqual(problems({ SMTP_HOST: "smtp.gmail.com" }), [
    "Con SMTP_HOST hace falta SMTP_USER",
    "Con SMTP_HOST hace falta SMTP_PASSWORD",
  ]);
  assert.deepEqual(problems({ SMTP_HOST: "smtp.gmail.com", SMTP_USER: "a@b.co", SMTP_PASSWORD: "p" }), []);
  assert.deepEqual(problems({ SMTP_USER: "a@b.co" }), ["Falta SMTP_HOST (las demás SMTP_* no se usan sin ella)"]);

  // Messages name the variable, never its value
  const leaky = {
    STRIPE_SECRET_KEY: "sk_live_SECRETO",
    CLERK_SECRET_KEY: "SECRETO",
    STRIPE_WEBHOOK_SECRET: "SECRETO",
    EMAIL_ENCRYPTION_KEY: "SECRETO",
    NEXT_PUBLIC_BASE_URL: "SECRETO",
    SMTP_PASSWORD: "SECRETO",
  };
  const leaked = problems(leaky);
  assert.ok(leaked.length >= 5);
  for (const message of leaked) assert.ok(!message.includes("SECRETO"), message);

  // A file saved by Windows tools (BOM + CRLF) reads cleanly, without touching process.env
  const dir = mkdtempSync(join(tmpdir(), "check-env-"));
  const windowsFile = join(dir, ".env.windows");
  writeFileSync(windowsFile, '﻿CHECK_ENV_SELF_TEST=production\r\nSTRIPE_WEBHOOK_SECRET="whsec_x"\r\n');
  assert.deepEqual({ ...readEnvFile(windowsFile) }, { CHECK_ENV_SELF_TEST: "production", STRIPE_WEBHOOK_SECRET: "whsec_x" });
  assert.equal(process.env.CHECK_ENV_SELF_TEST, undefined);
  assert.throws(() => readEnvFile(join(dir, "no-existe.env")), /^Error: No existe el archivo .*no-existe\.env$/);

  assert.equal(webhookUrl("https://tienda.com"), "https://tienda.com/api/webhook");
  assert.equal(webhookUrl("https://tienda.com/"), "https://tienda.com/api/webhook");
  const endpoints = [{ id: "we_1", url: "https://otra.com/api/webhook" }, { id: "we_2", url: "https://tienda.com/api/webhook" }];
  assert.equal(findWebhook(endpoints, "https://tienda.com/api/webhook").id, "we_2");
  assert.equal(findWebhook(endpoints, "https://nueva.com/api/webhook"), null);
  assert.equal(WEBHOOK_EVENT, "checkout.session.completed");

  console.log("check-env self-test: ok");
  process.exit(0);
}

// Read-only calls: nothing is created or changed in Sanity, Stripe or Clerk.
async function checkOnline(env) {
  const errors = [];
  const { NEXT_PUBLIC_SANITY_PROJECT_ID: project, NEXT_PUBLIC_SANITY_DATASET: dataset, NEXT_PUBLIC_SANITY_API_VERSION: version } = env;
  const query = encodeURIComponent('count(*[_type == "siteSettings"])');
  // ponytail: a Viewer token in SANITY_API_TOKEN passes this read; only a write would catch it (the panel's first save does).
  for (const name of ["SANITY_API_TOKEN", "SANITY_API_READ_TOKEN"]) {
    const status = await httpStatus(`https://${project}.api.sanity.io/v${version}/data/query/${dataset}?query=${query}`, env[name]);
    if (status !== 200) errors.push(`Sanity no aceptó ${name} (${status})`);
  }
  const clerk = await httpStatus("https://api.clerk.com/v1/users/count", env.CLERK_SECRET_KEY);
  if (clerk !== 200) errors.push(`Clerk no aceptó CLERK_SECRET_KEY (${clerk})`);
  try {
    const { data } = await new Stripe(env.STRIPE_SECRET_KEY).webhookEndpoints.list({ limit: 100 });
    const url = webhookUrl(env.NEXT_PUBLIC_BASE_URL);
    const endpoint = findWebhook(data, url);
    // Stripe can't reach localhost (local tests use `stripe listen`), so there is no webhook to find.
    if (new URL(url).hostname !== "localhost") {
      if (!endpoint) errors.push(`Stripe no tiene un webhook hacia ${url}: corre npm run stripe:webhook`);
      else if (endpoint.status !== "enabled") errors.push(`El webhook de Stripe hacia ${url} está desactivado`);
      else if (!endpoint.enabled_events.some((event) => event === WEBHOOK_EVENT || event === "*")) {
        errors.push(`El webhook de Stripe hacia ${url} no escucha ${WEBHOOK_EVENT}`);
      }
    }
  } catch (error) {
    errors.push(`Stripe no aceptó STRIPE_SECRET_KEY (${error.statusCode ?? "sin conexión"})`);
  }
  return errors;
}

// Status of a GET with a bearer token, or "sin conexión".
async function httpStatus(url, token) {
  try {
    return (await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).status;
  } catch {
    return "sin conexión";
  }
}

const file = args.find((arg) => !arg.startsWith("--")) ?? ".env.local";
const online = args.includes("--online");
let env;
try {
  env = readEnvFile(file);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const { errors, modes } = checkEnv(env);
const mode = (value) => (value ? `modo ${value}` : "sin definir");
console.log(`Archivo: ${file}`);
console.log(`Stripe: ${mode(modes.stripe)} · Clerk: ${mode(modes.clerk)}`);
if (online && errors.length > 0) console.log("Se omite --online hasta corregir estos problemas.");
else if (online) errors.push(...(await checkOnline(env)));
if (errors.length === 0) {
  console.log(online ? "Todo en orden, también en línea." : "Todo en orden.");
  process.exit(0);
}
console.log(`${errors.length} problema(s):`);
for (const error of errors) console.log(`  - ${error}`);
process.exit(1);
