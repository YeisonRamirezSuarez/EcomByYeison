# Newsletter (Boletín) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store owners manage newsletter subscribers and send product campaigns through their own store's SMTP server, from `/admin`, in line with CAN-SPAM and Ley 1581.

**Architecture:** Everything lives in Sanity, in private documents whose ids contain a dot:
- `config.smtp` holds the SMTP settings, with the password encrypted (AES-256-GCM).
- `config.smtpUsage` holds the daily counter.
- `subscriber.<hash>` holds each subscriber.
- `campaign.<uuid>` holds each campaign with its progress.

Pure modules carry the rules and the email HTML, and the node test script runs them. Sending goes in batches of 20 driven by the open admin page. Each batch reserves its recipients with a Sanity revision check, so two tabs never send the same people. Orders and campaigns share one nodemailer transport.

**Tech Stack:** Next.js 16.1 (App Router, server actions), React 19.2, Sanity 5 (`backendClient`), Clerk 7, nodemailer 8 (already installed), Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-10-07-newsletter-design.md`

## Global Constraints

- **Language:** all UI text is in Spanish, plain and short. Code comments are in English and match the surrounding density.
- **Dependencies:** none new. Use `nodemailer` (installed) and `node:crypto`.
- **Pure modules** (`lib/secrets.ts`, `lib/newsletter.ts`, `lib/campaignEmail.ts`) only use `import type` from other project files, because `scripts/check-permissions.mjs` runs them with `node --experimental-strip-types`.
  - `lib/secrets.ts` may import `node:crypto`.
  - Never import `lib/secrets.ts` from a client component.
- **Admin server actions:** call `requirePermission("configurar")` and return `ActionResult` (`lib/actionResult.ts`). Messages meant for the owner are thrown as `ActionError` (added in Task 4).
- **Sanity ids:** new documents use ids with a dot (`config.smtp`, `config.smtpUsage`, `campaign.<uuid>`). `config.smtp`, `config.smtpUsage` and `campaign` have no Studio schema.
- **`EMAIL_ENCRYPTION_KEY`** (any long random string) encrypts the SMTP password and signs unsubscribe links. The controller checks it is in `.env.local` before Task 4 and asks the user to add it if missing. Generate one with:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```
- **Public URL:** `NEXT_PUBLIC_BASE_URL` is the store's public URL. It is used to build absolute links in emails.
- **Dev server:** port 3000 only, already running. Never start, stop or restart it from a task. Never run `next build` before Task 9.
- **Commits:**
  - Implementers only `git add`. They never commit, push, stash, reset or checkout.
  - The controller commits after the user approves the message (ticket format, header `newsletter`) and picks the account.
  - No Claude/Anthropic attribution anywhere.
- **Names:** never name any other repository, company or client in code, comments, docs or commits.
- **No real email during verification.** Only an Ethereal test mailbox is used; it accepts messages and delivers nothing.
  - Ethereal credentials are saved in `.superpowers/sdd/2026-10-07-newsletter/ethereal.json` (git-ignored) and never printed.
  - Test subscriber addresses are `zz-…@example.com`.
- **Test data:**
  - Every test text contains "ZZ".
  - Clean up only through the panel's own buttons (Borrar, Quitar configuración). Never delete Sanity documents with scripts.
  - Never upload images to Sanity; leave the campaign image empty in tests.
  - Read-only Sanity checks with the script in Task 4 Step 9 are fine.

## Review Focus

1. **Page closed, reloaded or open in two tabs during a send:** nobody gets the campaign twice. Reopening shows "Continuar" and resumes after the last reserved subscriber. (Task 8 Steps 7–8.)
2. **Someone unsubscribes, by link or one click, while a campaign runs:** later batches skip them. (Task 8 Step 9.)
3. **The saved SMTP password can't be decrypted** (`EMAIL_ENCRYPTION_KEY` changed or missing):
   - Ajustes and the campaign say what to fix.
   - Order emails fail the same way they do today without SMTP.
   - Order processing itself does not break, because `lib/orders.ts` and the invoice route already catch email errors.

   (Task 4 Step 11 reads those catch blocks; Task 1 tests decrypt with a wrong key.)
4. **Large imports and lists:**
   - A 5000-row file and the existing-status lookup must stay within Sanity request limits, with writes in chunks of 200.
   - A batch must finish within one request (`maxDuration = 60`).

   (Task 6 Step 10: a 5001-row file is rejected in the browser. The 200-per-transaction loop is checked by reading the code: a live 300-row import would leave 300 rows to delete by hand.)
5. **A product picked for a campaign is later deleted or archived:** it disappears from the email and the preview, and the editor shows "Ya no existe" with Quitar. (Task 7 Step 9 runs the product query read-only with an archived id and an unknown id.)

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/secrets.ts` (new) | AES-256-GCM encrypt/decrypt, unsubscribe signature, subscriber document id. Pure (node:crypto). |
| `lib/newsletter.ts` (new) | Types, constants and pure rules: SMTP and campaign validation, send checks, CSV parse/export, import plan, daily limit, batch size, SMTP error classification, filter parsing. |
| `lib/campaignEmail.ts` (new) | Pure campaign email builder `renderCampaignEmail` → `{ subject, html, text }`. |
| `lib/actionResult.ts` (modify) | Adds `ActionError`: a message for the owner returned by `run()`. |
| `sanity/queries/newsletter.ts` (new) | Server-only reads: SMTP doc, usage, subscribers, campaigns, products for emails. |
| `lib/mailer.ts` (new) | Server-only nodemailer transport (panel settings or `SMTP_*`), daily usage counter. |
| `lib/email.ts` (modify) | Order emails send through `lib/mailer.ts`. |
| `lib/unsubscribe.ts` (new) | Server-only: site URL, signed unsubscribe links, apply an unsubscribe. |
| `lib/campaignSend.ts` (new) | Server-only: email brand, email products, send readiness, one batch (`runBatch`). |
| `actions/newsletterAdmin.ts` (new) | Admin server actions: SMTP, subscribers, campaigns, sending. |
| `actions/newsletter.ts` (modify) | Public subscribe: re-activates someone who unsubscribed. |
| `actions/unsubscribe.ts` (new) | Public unsubscribe action. |
| `app/(client)/api/boletin/baja/route.ts` (new) | One-click unsubscribe (POST). |
| `app/(client)/boletin/baja/page.tsx`, `components/UnsubscribeForm.tsx` (new) | Unsubscribe page. |
| `sanity/schemaTypes/subscriberType.ts` (modify) | `status`, `unsubscribedAt` fields. |
| `lib/permissions.ts`, `components/admin/shell/nav.ts` (modify) | New `boletin` section. |
| `components/admin/newsletter/SmtpSection.tsx` (new), `app/(admin)/admin/ajustes/page.tsx` (modify) | Ajustes → Correo. |
| `app/(admin)/admin/boletin/page.tsx` (new) | Boletín page (tabs). |
| `components/admin/newsletter/SubscribersTab.tsx`, `SubscriberTools.tsx`, `DeleteSubscriberButton.tsx` (new) | Suscriptores tab. |
| `components/admin/newsletter/CampaignsTab.tsx`, `NewCampaignButton.tsx` (new) | Campañas list. |
| `app/(admin)/admin/boletin/[id]/page.tsx`, `components/admin/newsletter/CampaignEditor.tsx`, `ProductPicker.tsx`, `CampaignSendPanel.tsx` (new) | Campaign editor, preview, sending. |
| `scripts/check-permissions.mjs` (modify) | Tests for the pure modules and the new section. |

---

### Task 1: Secrets (encryption, unsubscribe signature, subscriber id)

**Files:**
- Create: `lib/secrets.ts`
- Test: `scripts/check-permissions.mjs` (new block before the final `console.log`)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `encryptSecret(plain: string, secret: string): string`, returning `"v1." + base64url(iv|ciphertext|tag)`.
  - `decryptSecret(token: string, secret: string): string`, which throws on a wrong key, tampering or a bad format.
  - `signUnsubscribe(subscriberId: string, secret: string): string`.
  - `verifyUnsubscribe(subscriberId: string, signature: string, secret: string): boolean`.
  - `subscriberDocId(email: string): string`, returning `"subscriber." + first 32 hex of sha256(email)`. This is the same id `actions/newsletter.ts` creates today.

- [ ] **Step 1: Write the failing test**

Add before `console.log("check-permissions: ok");` in `scripts/check-permissions.mjs`:

```js
// Newsletter secrets: SMTP password encryption, unsubscribe signatures, subscriber ids
{
  const sec = await import("../lib/secrets.ts");
  const { createHash } = await import("node:crypto");
  const KEY = "clave-de-prueba";
  const token = sec.encryptSecret("contraseña ñ", KEY);
  assert.ok(token.startsWith("v1."));
  assert.ok(!token.includes("contraseña"));
  assert.equal(sec.decryptSecret(token, KEY), "contraseña ñ");
  assert.notEqual(sec.encryptSecret("x", KEY), sec.encryptSecret("x", KEY)); // random IV
  assert.throws(() => sec.decryptSecret(token, "otra-clave"));
  const flip = (index) => {
    const raw = Buffer.from(token.slice(3), "base64url");
    raw[index < 0 ? raw.length + index : index] ^= 1;
    return "v1." + raw.toString("base64url");
  };
  assert.throws(() => sec.decryptSecret(flip(14), KEY)); // ciphertext byte
  assert.throws(() => sec.decryptSecret(flip(-1), KEY)); // tag byte
  assert.throws(() => sec.decryptSecret("texto-plano", KEY));
  assert.throws(() => sec.decryptSecret("v1.AAAA", KEY));

  const sig = sec.signUnsubscribe("subscriber.abc", KEY);
  assert.equal(sec.verifyUnsubscribe("subscriber.abc", sig, KEY), true);
  assert.equal(sec.verifyUnsubscribe("subscriber.abd", sig, KEY), false);
  assert.equal(sec.verifyUnsubscribe("subscriber.abc", sig, "otra-clave"), false);
  assert.equal(sec.verifyUnsubscribe("subscriber.abc", "corta", KEY), false);
  assert.equal(sec.verifyUnsubscribe("subscriber.abc", "", KEY), false);

  const id = sec.subscriberDocId("ana@example.com");
  assert.equal(id, `subscriber.${createHash("sha256").update("ana@example.com").digest("hex").slice(0, 32)}`);
  assert.match(id, /^subscriber\.[a-f0-9]{32}$/);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/secrets.ts`.

- [ ] **Step 3: Write the implementation**

Create `lib/secrets.ts`:

```ts
// Newsletter secrets: the SMTP password is stored encrypted and unsubscribe links are signed,
// both with EMAIL_ENCRYPTION_KEY (passed in as `secret`). Server only: never import from a
// client component. Pure otherwise, so scripts/check-permissions.mjs can run it.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const VERSION = "v1.";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const keyBytes = (secret: string) => createHash("sha256").update(secret).digest();

export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(secret), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return VERSION + Buffer.concat([iv, data, cipher.getAuthTag()]).toString("base64url");
}

// Throws on a wrong key or a tampered value: a half-decrypted password is never returned.
export function decryptSecret(token: string, secret: string): string {
  if (!token.startsWith(VERSION)) throw new Error("Formato de secreto desconocido");
  const raw = Buffer.from(token.slice(VERSION.length), "base64url");
  if (raw.length <= IV_BYTES + TAG_BYTES) throw new Error("Secreto incompleto");
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(secret), raw.subarray(0, IV_BYTES));
  decipher.setAuthTag(raw.subarray(raw.length - TAG_BYTES));
  return Buffer.concat([decipher.update(raw.subarray(IV_BYTES, raw.length - TAG_BYTES)), decipher.final()]).toString("utf8");
}

export function signUnsubscribe(subscriberId: string, secret: string): string {
  return createHmac("sha256", "unsubscribe:" + secret).update(subscriberId).digest("base64url");
}

export function verifyUnsubscribe(subscriberId: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(signUnsubscribe(subscriberId, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Same email, same id. The dot keeps subscribers out of Sanity's public read API.
export function subscriberDocId(email: string): string {
  return `subscriber.${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run -s check:permissions 2>&1 | tail -1`
Expected: `check-permissions: ok`

- [ ] **Step 5: Stage**

```bash
git add lib/secrets.ts scripts/check-permissions.mjs
```

---

### Task 2: Newsletter rules (`lib/newsletter.ts`)

**Files:**
- Create: `lib/newsletter.ts`
- Test: `scripts/check-permissions.mjs` (new block)

**Interfaces:**
- Consumes: `type ImageValue`, `type Cta` (`lib/brand.ts`); `type ValidationResult` (`lib/validation.ts`).
- Produces. Later tasks use these exact names:
  - **Constants:**
    - `BATCH_SIZE = 20`, `MAX_IMPORT_ROWS = 5000`, `DEFAULT_DAILY_LIMIT = 450`;
    - `MAX_FAILURES = 50`, `MAX_CAMPAIGN_PRODUCTS = 6`, `PAGE_SIZE = 50`;
    - `SMTP_SECURITY`, `STATUS_LABELS`, `SOURCE_LABELS`, `CAMPAIGN_STATUS_LABELS`, `EMPTY_SMTP`, `EMPTY_CAMPAIGN`.
  - **Types:**
    - `SmtpSecurity`, `SmtpForm`, `SmtpView`;
    - `SubscriberStatus`, `SubscriberSource`, `SubscriberRow`, `SubscriberFilters`;
    - `CampaignStatus`, `PauseReason`, `CampaignContent`, `CampaignProgress`, `CampaignFailure`;
    - `SendReadiness`, `CsvResult`, `ImportPlan`, `SmtpErrorInfo`.
  - **Validation:**
    - `isEmail`, `isHttpsUrl`, `isValidHref`, `isSubscriberId`, `isCampaignId`;
    - `validateSmtpSettings(input, { hasStoredPassword }): ValidationResult<SmtpForm>`;
    - `validateCampaign(input): ValidationResult<CampaignContent>`;
    - `campaignSendProblems(content: CampaignContent, ready: SendReadiness): string[]`.
  - **Subscribers:**
    - `parseEmailCsv(text: string): CsvResult`;
    - `planImport(emails: string[], existing: Record<string, SubscriberStatus>): ImportPlan`;
    - `subscribersCsv(rows: SubscriberRow[]): string`;
    - `readSubscriberFilters(params: Record<string, string | string[] | undefined>): SubscriberFilters`.
  - **Sending:**
    - `utcDay(date?: Date): string`;
    - `remainingToday(limit, usage, today): number`;
    - `batchSize(remaining): number`;
    - `progressPercent(done, total): number`.
  - **SMTP errors:**
    - `isRecipientError(error: SmtpErrorInfo): boolean`;
    - `smtpErrorMessage(error: SmtpErrorInfo): string`;
    - `errorDetail(error: unknown): string`.

- [ ] **Step 1: Write the failing test**

Add before the final `console.log` in `scripts/check-permissions.mjs`:

```js
// Newsletter rules
{
  const nl = await import("../lib/newsletter.ts");

  // Same email and link rules as lib/validation.ts
  for (const sample of ["/shop", "//evil.com", "/\\x", "https://a.co", "http://a.co", "javascript:alert(1)", "", "a@b.co", "a b@c.co"]) {
    assert.equal(nl.isValidHref(sample), v.isValidHref(sample), sample);
    assert.equal(nl.isEmail(sample), v.isEmail(sample), sample);
  }
  assert.equal(nl.isSubscriberId("subscriber.0123456789abcdef0123456789abcdef"), true);
  assert.equal(nl.isSubscriberId("subscriber.xyz"), false);
  assert.equal(nl.isSubscriberId("drafts.subscriber.0123456789abcdef0123456789abcdef"), false);
  assert.equal(nl.isCampaignId("3f2b8c1e-9a4d-4e2f-8b1a-2c3d4e5f6a7b"), true);
  assert.equal(nl.isCampaignId("campaign.3f2b8c1e-9a4d-4e2f-8b1a-2c3d4e5f6a7b"), false);

  // SMTP settings
  const smtp = { host: "smtp.example.com", port: "587", security: "starttls", user: "zz@example.com", password: "secreta", fromName: "", fromEmail: "ZZ@Example.com", replyTo: "", dailyLimit: "450" };
  const okSmtp = nl.validateSmtpSettings(smtp, { hasStoredPassword: false });
  assert.ok(okSmtp.ok);
  assert.equal(okSmtp.value.port, 587);
  assert.equal(okSmtp.value.fromEmail, "zz@example.com");
  assert.equal(okSmtp.value.dailyLimit, 450);
  const badSmtp = nl.validateSmtpSettings({ ...smtp, host: "", port: "99999", fromEmail: "no", replyTo: "x", dailyLimit: "0", password: "" }, { hasStoredPassword: false });
  assert.ok(!badSmtp.ok);
  for (const key of ["host", "port", "fromEmail", "replyTo", "dailyLimit", "password"]) assert.ok(badSmtp.errors[key], `smtp error ${key}`);
  assert.ok(nl.validateSmtpSettings({ ...smtp, password: "" }, { hasStoredPassword: true }).ok); // keeps the saved one
  assert.ok(nl.validateSmtpSettings({ ...smtp, user: "", password: "" }, { hasStoredPassword: false }).ok); // no login
  assert.ok(nl.validateSmtpSettings({ ...smtp, host: "smtp example.com" }, { hasStoredPassword: false }).errors.host);
  assert.equal(nl.validateSmtpSettings({ ...smtp, security: "rara" }, { hasStoredPassword: false }).value.security, "starttls");

  // Campaign
  const content = { ...nl.EMPTY_CAMPAIGN, subject: " Ofertas ", title: "ZZ Hola", button: { label: "Ver", href: "/shop" }, products: ["p1", "p2", "p1"] };
  const okCampaign = nl.validateCampaign(content);
  assert.ok(okCampaign.ok);
  assert.equal(okCampaign.value.subject, "Ofertas");
  assert.deepEqual(okCampaign.value.products, ["p1", "p2"]);
  const badCampaign = nl.validateCampaign({ ...content, subject: "x".repeat(151), button: { label: "Ver", href: "javascript:alert(1)" }, image: { assetId: "nope", url: "http://x" }, products: ["a", "b", "c", "d", "e", "f", "g"] });
  assert.ok(!badCampaign.ok);
  for (const key of ["subject", "button.href", "image", "products"]) assert.ok(badCampaign.errors[key], `campaign error ${key}`);
  assert.ok(nl.validateCampaign({ ...content, products: ["drafts.p1"] }).errors.products);
  assert.ok(nl.validateCampaign({ ...content, subject: "", title: "" }).ok); // drafts may be empty

  // What blocks sending
  const ready = { smtpReady: true, keyReady: true, baseUrl: "https://tienda.com", address: "Calle 1", activeCount: 3 };
  assert.deepEqual(nl.campaignSendProblems(okCampaign.value, ready), []);
  assert.equal(nl.campaignSendProblems({ ...okCampaign.value, subject: "", title: "" }, { smtpReady: false, keyReady: false, baseUrl: "", address: " ", activeCount: 0 }).length, 7);

  // CSV import
  const csv = "﻿Nombre;Correo\r\n\"Pérez; Ana\";ANA@example.com\r\nLuis;luis@example.com\r\nOtra;ana@example.com\r\nMal;no-es-correo\r\n;\r\n";
  const parsed = nl.parseEmailCsv(csv);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.emails, ["ana@example.com", "luis@example.com"]);
  assert.deepEqual(parsed.invalid, ["no-es-correo"]);
  assert.equal(parsed.duplicates, 1);
  const noHeader = nl.parseEmailCsv("x,uno@example.com\ny,\"dos@example.com\"\n");
  assert.ok(noHeader.ok);
  assert.deepEqual(noHeader.emails, ["uno@example.com", "dos@example.com"]);
  assert.deepEqual(nl.parseEmailCsv("email\ntres@example.com").emails, ["tres@example.com"]);
  assert.deepEqual(nl.parseEmailCsv("\"a,b\",cuatro@example.com").emails, ["cuatro@example.com"]);
  assert.equal(nl.parseEmailCsv("solo,texto\nsin,correos").ok, false);
  const big = "email\n" + Array.from({ length: nl.MAX_IMPORT_ROWS + 1 }, (_, i) => `zz${i}@example.com`).join("\n");
  assert.equal(nl.parseEmailCsv(big).ok, false);

  // Import plan never re-activates someone who unsubscribed
  assert.deepEqual(
    nl.planImport(["a@x.co", "b@x.co", "c@x.co"], { "b@x.co": "active", "c@x.co": "unsubscribed" }),
    { create: ["a@x.co"], already: 1, skippedUnsubscribed: 1 }
  );

  // CSV export: BOM, header, labels, quoting, no spreadsheet formulas
  const exported = nl.subscribersCsv([
    { _id: "s1", email: "ana@example.com", subscribedAt: "2026-10-07T10:00:00.000Z", source: "import", status: "unsubscribed" },
    { _id: "s2", email: "=cmd@example.com", subscribedAt: null, source: "footer", status: "active" },
  ]);
  assert.ok(exported.startsWith("﻿email,fecha,origen,estado\r\n"));
  assert.ok(exported.includes("ana@example.com,2026-10-07,Importado,Dado de baja\r\n"));
  assert.ok(exported.includes("'=cmd@example.com,,Pie de página,Activo\r\n"));

  // Filters from the URL
  assert.deepEqual(nl.readSubscriberFilters({}), { search: "", status: "all", page: 0 });
  assert.deepEqual(nl.readSubscriberFilters({ q: " ZZ ", estado: "unsubscribed", pagina: "3" }), { search: "zz", status: "unsubscribed", page: 2 });
  assert.deepEqual(nl.readSubscriberFilters({ estado: "hacker", pagina: "-4" }), { search: "", status: "all", page: 0 });

  // Daily limit and batches
  assert.match(nl.utcDay(new Date("2026-10-07T23:59:00Z")), /^2026-10-07$/);
  assert.equal(nl.remainingToday(450, null, "2026-10-07"), 450);
  assert.equal(nl.remainingToday(450, { date: "2026-10-07", count: 440 }, "2026-10-07"), 10);
  assert.equal(nl.remainingToday(450, { date: "2026-10-06", count: 450 }, "2026-10-07"), 450);
  assert.equal(nl.remainingToday(450, { date: "2026-10-07", count: 500 }, "2026-10-07"), 0);
  assert.equal(nl.batchSize(450), nl.BATCH_SIZE);
  assert.equal(nl.batchSize(7), 7);
  assert.equal(nl.batchSize(0), 0);
  assert.equal(nl.progressPercent(5, 10), 50);
  assert.equal(nl.progressPercent(12, 10), 100);
  assert.equal(nl.progressPercent(0, 0), 100);

  // SMTP errors: a dead server pauses the campaign, a refused address only fails that one
  assert.equal(nl.isRecipientError({ code: "EENVELOPE", responseCode: 550, command: "RCPT TO" }), true);
  assert.equal(nl.isRecipientError({ code: "EMESSAGE", responseCode: 554, command: "DATA" }), true);
  assert.equal(nl.isRecipientError({ code: "EAUTH", responseCode: 535 }), false);
  assert.equal(nl.isRecipientError({ code: "ECONNECTION" }), false);
  assert.equal(nl.isRecipientError({ code: "EENVELOPE", responseCode: 553, command: "MAIL FROM" }), false);
  assert.equal(nl.isRecipientError({ responseCode: 421 }), false);
  assert.equal(nl.isRecipientError({}), false);
  assert.match(nl.smtpErrorMessage({ code: "EAUTH" }), /contraseña/);
  assert.match(nl.smtpErrorMessage({ code: "ECONNECTION" }), /conectar/);
  assert.match(nl.smtpErrorMessage({ code: "ETIMEDOUT" }), /a tiempo/);
  assert.match(nl.smtpErrorMessage({ responseCode: 451 }), /esperar/);
  assert.match(nl.smtpErrorMessage({ command: "MAIL FROM", responseCode: 553 }), /remitente/);
  assert.equal(nl.errorDetail(new Error("x".repeat(400))).length, 300);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/newsletter.ts`.

- [ ] **Step 3: Write the implementation**

Create `lib/newsletter.ts`:

```ts
// Newsletter rules shared by the admin panel (browser) and server actions: SMTP settings,
// subscribers, CSV import/export, campaigns and sending. Pure: only type imports, so
// scripts/check-permissions.mjs can run it.
import type { Cta, ImageValue } from "./brand";
import type { ValidationResult } from "./validation";

export const BATCH_SIZE = 20;
export const MAX_IMPORT_ROWS = 5000;
export const DEFAULT_DAILY_LIMIT = 450;
export const MAX_FAILURES = 50;
export const MAX_CAMPAIGN_PRODUCTS = 6;
export const PAGE_SIZE = 50;

export const SMTP_SECURITY = { starttls: "STARTTLS", ssl: "SSL", none: "Ninguna" } as const;
export type SmtpSecurity = keyof typeof SMTP_SECURITY;
export type SmtpForm = {
  host: string;
  port: number;
  security: SmtpSecurity;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  dailyLimit: number;
};
// What the browser gets: never the password, only whether one is saved.
export type SmtpView = Omit<SmtpForm, "password"> & { hasPassword: boolean };
export const EMPTY_SMTP: SmtpView = {
  host: "",
  port: 587,
  security: "starttls",
  user: "",
  hasPassword: false,
  fromName: "",
  fromEmail: "",
  replyTo: "",
  dailyLimit: DEFAULT_DAILY_LIMIT,
};

export type SubscriberStatus = "active" | "unsubscribed";
export type SubscriberSource = "footer" | "manual" | "import";
export const STATUS_LABELS: Record<SubscriberStatus, string> = { active: "Activo", unsubscribed: "Dado de baja" };
export const SOURCE_LABELS: Record<SubscriberSource, string> = { footer: "Pie de página", manual: "Manual", import: "Importado" };
export type SubscriberRow = { _id: string; email: string; subscribedAt: string | null; source: SubscriberSource; status: SubscriberStatus };
export type SubscriberFilters = { search: string; status: SubscriberStatus | "all"; page: number };

export type CampaignStatus = "draft" | "sending" | "paused" | "sent";
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador",
  sending: "Enviando",
  paused: "En pausa",
  sent: "Enviada",
};
export type PauseReason = "user" | "limit" | "smtp";
export type CampaignContent = {
  subject: string;
  preheader: string;
  image: ImageValue | null;
  title: string;
  text: string;
  button: Cta;
  products: string[];
};
export const EMPTY_CAMPAIGN: CampaignContent = {
  subject: "",
  preheader: "",
  image: null,
  title: "",
  text: "",
  button: { label: "", href: "" },
  products: [],
};
export type CampaignProgress = {
  status: CampaignStatus;
  total: number;
  sent: number;
  failed: number;
  pauseReason: PauseReason | null;
  pauseMessage: string;
};
export type CampaignFailure = { email: string; error: string };
export type SendReadiness = { smtpReady: boolean; keyReady: boolean; baseUrl: string; address: string; activeCount: number };

type Errors = Record<string, string>;
const REQUIRED = "Campo obligatorio";
const EMAIL_ERROR = "Ingresa un correo válido";
const HREF_ERROR = "Usa una ruta que empiece por / o un enlace https://";
const tooLong = (max: number) => `Máximo ${max} caracteres`;
const ASSET_ID = /^image-[a-zA-Z0-9]+-\d+x\d+-[a-z0-9]+$/;
const DOC_ID = /^[a-zA-Z0-9_-]{1,100}$/;
const SUBSCRIBER_ID = /^subscriber\.[a-f0-9]{32}$/;
const CAMPAIGN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const result = <T>(errors: Errors, value: T): ValidationResult<T> =>
  Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };

// Same rules as lib/validation.ts: a runtime import would break the node test run, so a
// test in scripts/check-permissions.mjs keeps both copies in step.
export function isEmail(value: unknown): boolean {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isHttpsUrl(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 300) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isValidHref(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 300) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  return isHttpsUrl(value);
}

export const isSubscriberId = (value: unknown): value is string => typeof value === "string" && SUBSCRIBER_ID.test(value);
export const isCampaignId = (value: unknown): value is string => typeof value === "string" && CAMPAIGN_ID.test(value);

function text(errors: Errors, key: string, value: unknown, max: number, required = false): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length > max) errors[key] = tooLong(max);
  else if (required && !s) errors[key] = REQUIRED;
  return s;
}

function int(errors: Errors, key: string, value: unknown, min: number, max: number, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n === "number" && Number.isInteger(n) && n >= min && n <= max) return n;
  errors[key] = `Elige un número entre ${min} y ${max}`;
  return fallback;
}

export function validateSmtpSettings(input: unknown, { hasStoredPassword }: { hasStoredPassword: boolean }): ValidationResult<SmtpForm> {
  const v = asObject(input);
  const errors: Errors = {};
  const host = text(errors, "host", v.host, 200, true);
  if (host && /\s/.test(host)) errors.host = "Servidor inválido";
  const port = int(errors, "port", v.port, 1, 65535, 587);
  const security: SmtpSecurity =
    typeof v.security === "string" && Object.hasOwn(SMTP_SECURITY, v.security) ? (v.security as SmtpSecurity) : "starttls";
  const user = text(errors, "user", v.user, 200);
  const password = typeof v.password === "string" ? v.password : "";
  if (password.length > 500) errors.password = tooLong(500);
  else if (user && !password && !hasStoredPassword) errors.password = "Escribe la contraseña";
  const fromName = text(errors, "fromName", v.fromName, 80);
  const fromEmail = text(errors, "fromEmail", v.fromEmail, 254, true).toLowerCase();
  if (fromEmail && !isEmail(fromEmail)) errors.fromEmail = EMAIL_ERROR;
  const replyTo = text(errors, "replyTo", v.replyTo, 254).toLowerCase();
  if (replyTo && !isEmail(replyTo)) errors.replyTo = EMAIL_ERROR;
  const dailyLimit = int(errors, "dailyLimit", v.dailyLimit, 1, 100000, DEFAULT_DAILY_LIMIT);
  return result(errors, { host, port, security, user, password, fromName, fromEmail, replyTo, dailyLimit });
}

// Draft rules: a draft may be empty. What sending needs is in campaignSendProblems.
export function validateCampaign(input: unknown): ValidationResult<CampaignContent> {
  const v = asObject(input);
  const errors: Errors = {};
  const subject = text(errors, "subject", v.subject, 150);
  const preheader = text(errors, "preheader", v.preheader, 150);
  const title = text(errors, "title", v.title, 120);
  const body = text(errors, "text", v.text, 3000);
  const b = asObject(v.button);
  const label = text(errors, "button.label", b.label, 30);
  const href = text(errors, "button.href", b.href, 200);
  if (href && !errors["button.href"] && !isValidHref(href)) errors["button.href"] = HREF_ERROR;
  let image: ImageValue | null = null;
  if (v.image !== null && v.image !== undefined) {
    const i = asObject(v.image);
    if (typeof i.assetId === "string" && ASSET_ID.test(i.assetId) && isHttpsUrl(i.url)) image = { assetId: i.assetId, url: i.url as string };
    else errors.image = "Imagen inválida";
  }
  const raw = Array.isArray(v.products) ? v.products : [];
  const ids = raw.filter((id): id is string => typeof id === "string" && DOC_ID.test(id));
  if (ids.length !== raw.length) errors.products = "Producto inválido";
  const products = [...new Set(ids)];
  if (products.length > MAX_CAMPAIGN_PRODUCTS) errors.products = `Máximo ${MAX_CAMPAIGN_PRODUCTS} productos`;
  return result(errors, { subject, preheader, image, title, text: body, button: { label, href }, products });
}

export function campaignSendProblems(content: CampaignContent, ready: SendReadiness): string[] {
  const problems: string[] = [];
  if (!ready.smtpReady) problems.push("Configura el correo de salida en Ajustes → Correo.");
  if (!ready.keyReady) problems.push("Falta la clave de cifrado en el servidor (EMAIL_ENCRYPTION_KEY).");
  if (!ready.baseUrl) problems.push("Falta la dirección pública de la tienda en el servidor (NEXT_PUBLIC_BASE_URL).");
  if (!ready.address.trim()) problems.push("Agrega la dirección de la tienda en Apariencia → Datos de la tienda → Contacto.");
  if (!content.subject.trim()) problems.push("Escribe el asunto.");
  if (!content.title.trim()) problems.push("Escribe el título.");
  if (ready.activeCount === 0) problems.push("No hay suscriptores activos.");
  return problems;
}

export type CsvResult = { ok: true; emails: string[]; invalid: string[]; duplicates: number } | { ok: false; error: string };
const EMAIL_HEADER = /^(e-?mail|correo( electr[oó]nico)?)$/i;
const count = (text: string, char: string) => text.split(char).length - 1;

function csvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((value) => value.trim()));
}

// Excel in Spanish saves with ";" and a BOM; the email column is found by its header or,
// without one, by the first cell that looks like an email.
export function parseEmailCsv(raw: string): CsvResult {
  const text = raw.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const rows = csvRows(text, count(firstLine, ";") > count(firstLine, ",") ? ";" : ",");
  const clean = (value: string | undefined) => (value ?? "").trim().toLowerCase();
  let column = rows.length > 0 ? rows[0].findIndex((cell) => EMAIL_HEADER.test(cell.trim())) : -1;
  let start = column >= 0 ? 1 : 0;
  if (column < 0) {
    const first = rows.findIndex((row) => row.some((cell) => isEmail(clean(cell))));
    if (first < 0) return { ok: false, error: "No encontramos una columna de correos" };
    column = rows[first].findIndex((cell) => isEmail(clean(cell)));
    start = first;
  }
  const data = rows.slice(start);
  if (data.length > MAX_IMPORT_ROWS) return { ok: false, error: `Divide el archivo en partes de ${MAX_IMPORT_ROWS}` };
  const seen = new Set<string>();
  const emails: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;
  for (const row of data) {
    const email = clean(row[column]);
    if (!email) continue;
    if (!isEmail(email)) invalid.push(email);
    else if (seen.has(email)) duplicates++;
    else {
      seen.add(email);
      emails.push(email);
    }
  }
  return { ok: true, emails, invalid, duplicates };
}

export type ImportPlan = { create: string[]; already: number; skippedUnsubscribed: number };

// Someone who unsubscribed only comes back by asking again from the store's own form.
export function planImport(emails: string[], existing: Record<string, SubscriberStatus>): ImportPlan {
  const plan: ImportPlan = { create: [], already: 0, skippedUnsubscribed: 0 };
  for (const email of emails) {
    if (existing[email] === "unsubscribed") plan.skippedUnsubscribed++;
    else if (existing[email]) plan.already++;
    else plan.create.push(email);
  }
  return plan;
}

export function subscribersCsv(rows: SubscriberRow[]): string {
  const cell = (value: string) => {
    // A leading = + - @ would run as a formula in Excel.
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",;\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = rows.map((r) =>
    [r.email, r.subscribedAt?.slice(0, 10) ?? "", SOURCE_LABELS[r.source], STATUS_LABELS[r.status]].map(cell).join(",")
  );
  return "﻿" + ["email,fecha,origen,estado", ...lines].join("\r\n") + "\r\n";
}

export function readSubscriberFilters(params: Record<string, string | string[] | undefined>): SubscriberFilters {
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const status = one(params.estado);
  const page = Math.floor(Number(one(params.pagina)) || 1);
  return {
    search: one(params.q).trim().toLowerCase().slice(0, 100),
    status: status === "active" || status === "unsubscribed" ? status : "all",
    page: Math.max(1, page) - 1,
  };
}

export const utcDay = (date = new Date()): string => date.toISOString().slice(0, 10);

export function remainingToday(limit: number, usage: { date: string; count: number } | null, today: string): number {
  const used = usage?.date === today ? usage.count : 0;
  return Math.max(0, limit - used);
}

export const batchSize = (remaining: number): number => Math.max(0, Math.min(BATCH_SIZE, remaining));

export const progressPercent = (done: number, total: number): number =>
  total > 0 ? Math.min(100, Math.round((done * 100) / total)) : 100;

// nodemailer errors carry `code` (EAUTH, ECONNECTION…), `responseCode` and `command`.
export type SmtpErrorInfo = { code?: unknown; responseCode?: unknown; command?: unknown };
const FATAL_CODES = new Set(["EAUTH", "ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ETLS", "EPROTOCOL"]);
const errorParts = (error: SmtpErrorInfo) => ({
  code: typeof error?.code === "string" ? error.code : "",
  response: typeof error?.responseCode === "number" ? error.responseCode : 0,
  command: typeof error?.command === "string" ? error.command.toUpperCase() : "",
});

// true = only this address failed, keep sending. false = the server itself failed (login,
// connection, sender refused, "try later"), so every next message would fail too: pause.
export function isRecipientError(error: SmtpErrorInfo): boolean {
  const { code, response, command } = errorParts(error);
  if (FATAL_CODES.has(code) || command.startsWith("MAIL FROM")) return false;
  return response >= 500 && response < 600;
}

export function smtpErrorMessage(error: SmtpErrorInfo): string {
  const { code, response, command } = errorParts(error);
  if (code === "EAUTH" || response === 535) return "Usuario o contraseña incorrectos. Si usas Gmail, usa una contraseña de aplicación.";
  if (code === "ETIMEDOUT") return "El servidor no respondió a tiempo. Revisa el servidor y el puerto.";
  if (code === "ETLS") return "Falló la conexión segura. Prueba con otra opción de seguridad (STARTTLS o SSL).";
  if (code === "ECONNECTION" || code === "EDNS" || code === "ESOCKET") return "No se pudo conectar al servidor. Revisa el servidor, el puerto y la seguridad.";
  if (command.startsWith("MAIL FROM")) return "El servidor rechazó el remitente. Usa un correo de remitente permitido por ese servidor.";
  if (response >= 400 && response < 500) return "El servidor pidió esperar (puede ser un límite de envío). Intenta más tarde.";
  if (response >= 500) return "El servidor rechazó este correo.";
  return "No se pudo enviar el correo.";
}

export const errorDetail = (error: unknown): string => (error instanceof Error ? error.message : String(error)).slice(0, 300);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run -s check:permissions 2>&1 | tail -1`
Expected: `check-permissions: ok`

- [ ] **Step 5: Stage**

```bash
git add lib/newsletter.ts scripts/check-permissions.mjs
```

---

### Task 3: Campaign email HTML (`lib/campaignEmail.ts`)

**Files:**
- Create: `lib/campaignEmail.ts`
- Test: `scripts/check-permissions.mjs` (new block)

**Interfaces:**
- Consumes: `type CampaignContent`, `EMPTY_CAMPAIGN` (Task 2).
- Produces:
  - `type EmailProduct = { name: string; url: string; imageUrl: string | null; price: string }`;
  - `type EmailBrand = { storeName: string; logoUrl: string | null; address: string; primary: string; button: string }`;
  - `renderCampaignEmail(input: { content; products: EmailProduct[]; brand: EmailBrand; baseUrl: string; unsubscribeUrl: string }): { subject: string; html: string; text: string }`.

- [ ] **Step 1: Write the failing test**

Add before the final `console.log`:

```js
// Campaign email HTML
{
  const ce = await import("../lib/campaignEmail.ts");
  const nl = await import("../lib/newsletter.ts");
  const content = {
    ...nl.EMPTY_CAMPAIGN,
    subject: "Ofertas <hoy>",
    preheader: "Solo hoy",
    title: 'Hasta 50% "off"',
    text: "Hola <script>alert(1)</script>\nlínea 2\n\nSegundo párrafo",
    button: { label: "Ver", href: "/shop" },
  };
  const brand = { storeName: "Tienda & Co", logoUrl: null, address: "Calle 1 #2-3, Bogotá", primary: "#9a3412", button: "#1d4ed8" };
  const products = [{ name: "Audífonos", url: "/product/audifonos", imageUrl: "https://cdn.sanity.io/images/p/d/a.png", price: "$ 10.000" }];
  const out = ce.renderCampaignEmail({ content, products, brand, baseUrl: "https://tienda.com/", unsubscribeUrl: "https://tienda.com/boletin/baja?s=x&t=y" });
  assert.equal(out.subject, "Ofertas <hoy>");
  assert.ok(!out.html.includes("<script>"));
  assert.ok(out.html.includes("Hola &lt;script&gt;alert(1)&lt;/script&gt;<br>línea 2"));
  assert.ok(out.html.includes("Hasta 50% &quot;off&quot;"));
  assert.ok(out.html.includes("Solo hoy"));
  assert.ok(out.html.includes("Tienda &amp; Co · Calle 1 #2-3, Bogotá"));
  assert.ok(out.html.includes('href="https://tienda.com/boletin/baja?s=x&amp;t=y"'));
  assert.ok(out.html.includes('href="https://tienda.com/shop"'));
  assert.ok(out.html.includes(">Ver</a>"));
  assert.ok(out.html.includes("#1d4ed8"));
  assert.ok(out.html.includes('href="https://tienda.com/product/audifonos"'));
  assert.ok(out.html.includes("https://cdn.sanity.io/images/p/d/a.png?w=400&amp;h=400&amp;fit=crop&amp;auto=format"));
  assert.ok(out.html.includes("$ 10.000"));
  assert.ok(out.text.includes("Ver: https://tienda.com/shop"));
  assert.ok(out.text.includes("- Audífonos — $ 10.000: https://tienda.com/product/audifonos"));
  assert.ok(out.text.includes("Darte de baja: https://tienda.com/boletin/baja?s=x&t=y"));

  // Incomplete button hidden, unsafe colors replaced, footer always there
  const bare = ce.renderCampaignEmail({
    content: { ...content, button: { label: "Ver", href: "" } },
    products: [],
    brand: { ...brand, button: "red;background:url(x)" },
    baseUrl: "https://tienda.com",
    unsubscribeUrl: "https://tienda.com/boletin/baja",
  });
  assert.ok(!bare.html.includes(">Ver</a>"));
  assert.ok(!bare.html.includes("red;background"));
  assert.ok(bare.html.includes("Darte de baja"));
  assert.ok(bare.html.includes("Recibes este correo porque te suscribiste en Tienda &amp; Co."));
  assert.equal(ce.renderCampaignEmail({ content: { ...content, subject: "" }, products: [], brand, baseUrl: "", unsubscribeUrl: "#" }).subject, content.title);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/campaignEmail.ts`.

- [ ] **Step 3: Write the implementation**

Create `lib/campaignEmail.ts`:

```ts
// The campaign email: one function for the editor's preview and for sending, so both match.
// Table layout with inline styles (what Gmail, Outlook and phones render). Every text the owner
// typed is escaped. Pure: only type imports, so scripts/check-permissions.mjs can run it.
import type { CampaignContent } from "./newsletter";

export type EmailProduct = { name: string; url: string; imageUrl: string | null; price: string };
export type EmailBrand = { storeName: string; logoUrl: string | null; address: string; primary: string; button: string };
export type CampaignEmailInput = {
  content: CampaignContent;
  products: EmailProduct[];
  brand: EmailBrand;
  baseUrl: string;
  unsubscribeUrl: string;
};

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const HEX = /^#[0-9a-fA-F]{6}$/;
const safeColor = (value: string, fallback: string) => (HEX.test(value) ? value : fallback);
const absolute = (href: string, base: string) => (href.startsWith("/") ? base.replace(/\/+$/, "") + href : href);
const sized = (url: string, params: string) => (url.startsWith("https://cdn.sanity.io/") ? `${url}?${params}` : url);
const paragraphs = (text: string) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const FONT = "font-family:Arial,Helvetica,sans-serif";

export function renderCampaignEmail({ content, products, brand, baseUrl, unsubscribeUrl }: CampaignEmailInput) {
  const primary = safeColor(brand.primary, "#111827");
  const button = safeColor(brand.button, primary);
  const subject = content.subject.trim() || content.title;
  const showButton = Boolean(content.button.label && content.button.href);
  const buttonUrl = showButton ? absolute(content.button.href, baseUrl) : "";
  const items = products.map((p) => ({ ...p, url: absolute(p.url, baseUrl) }));
  const footerLine = brand.address ? `${brand.storeName} · ${brand.address}` : brand.storeName;

  const header = brand.logoUrl
    ? `<img src="${esc(sized(brand.logoUrl, "h=96&auto=format"))}" alt="${esc(brand.storeName)}" height="48" style="height:48px;width:auto;border:0;display:block;margin:0 auto">`
    : `<span style="${FONT};font-size:22px;font-weight:700;color:${primary}">${esc(brand.storeName)}</span>`;
  const hero = content.image
    ? `<tr><td><img src="${esc(sized(content.image.url, "w=1200&auto=format"))}" alt="" width="600" style="width:100%;max-width:600px;height:auto;border:0;display:block"></td></tr>`
    : "";
  const body = paragraphs(content.text)
    .map((p) => `<p style="${FONT};margin:0 0 16px;font-size:16px;line-height:1.5;color:#374151">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const cta = showButton
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="background:${button};border-radius:8px"><a href="${esc(buttonUrl)}" style="${FONT};display:inline-block;padding:12px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${esc(content.button.label)}</a></td></tr></table>`
    : "";
  const card = (p: (typeof items)[number]) =>
    `<td width="50%" valign="top" style="padding:8px"><a href="${esc(p.url)}" style="text-decoration:none;color:#111827">` +
    (p.imageUrl
      ? `<img src="${esc(sized(p.imageUrl, "w=400&h=400&fit=crop&auto=format"))}" alt="" width="260" style="width:100%;max-width:260px;height:auto;border:0;border-radius:8px;display:block">`
      : "") +
    `<p style="${FONT};margin:8px 0 2px;font-size:14px;font-weight:600;color:#111827">${esc(p.name)}</p>` +
    `<p style="${FONT};margin:0;font-size:14px;font-weight:700;color:${primary}">${esc(p.price)}</p></a></td>`;
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(`<tr>${card(items[i])}${items[i + 1] ? card(items[i + 1]) : '<td width="50%"></td>'}</tr>`);
  }
  const grid = rows.length > 0 ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>` : "";

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(content.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td align="center" style="padding:24px">${header}</td></tr>
${hero}
<tr><td style="padding:24px">
<h1 style="${FONT};margin:0 0 16px;font-size:26px;line-height:1.25;color:${primary}">${esc(content.title)}</h1>
${body}${cta}${grid}
</td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px"><tr><td style="padding:16px 24px;text-align:center">
<p style="${FONT};margin:0 0 6px;font-size:12px;color:#6b7280">${esc(footerLine)}</p>
<p style="${FONT};margin:0;font-size:12px;color:#6b7280">Recibes este correo porque te suscribiste en ${esc(brand.storeName)}. <a href="${esc(unsubscribeUrl)}" style="color:#6b7280">Darte de baja</a></p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  const text = [
    brand.storeName,
    "",
    content.title,
    "",
    ...paragraphs(content.text).flatMap((p) => [p, ""]),
    ...(showButton ? [`${content.button.label}: ${buttonUrl}`, ""] : []),
    ...items.map((p) => `- ${p.name} — ${p.price}: ${p.url}`),
    ...(items.length > 0 ? [""] : []),
    "---",
    footerLine,
    `Recibes este correo porque te suscribiste en ${brand.storeName}.`,
    `Darte de baja: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run -s check:permissions 2>&1 | tail -1`
Expected: `check-permissions: ok`

- [ ] **Step 5: Stage**

```bash
git add lib/campaignEmail.ts scripts/check-permissions.mjs
```

---

### Task 4: Outgoing mail — transport, Ajustes → Correo, order emails

**Files:**
- Modify: `lib/actionResult.ts` (add `ActionError`)
- Create: `sanity/queries/newsletter.ts`
- Create: `lib/mailer.ts`
- Modify: `lib/email.ts:1-48` (transport block and `sendEmail`)
- Create: `actions/newsletterAdmin.ts`
- Create: `components/admin/newsletter/SmtpSection.tsx`
- Modify: `app/(admin)/admin/ajustes/page.tsx`

**Interfaces:**
- Consumes:
  - from Task 1: `encryptSecret`, `decryptSecret`;
  - from Task 2: `validateSmtpSettings`, `smtpErrorMessage`, `errorDetail`, `remainingToday`, `utcDay`, `DEFAULT_DAILY_LIMIT`, `EMPTY_SMTP`, `SMTP_SECURITY`, `type SmtpView`, `type SmtpSecurity`, `type SmtpErrorInfo`;
  - existing: `run`, `requirePermission`, `INVALID_FORM`, `INPUT`, `getSiteSettings`.
- Produces:
  - `class ActionError extends Error` (in `lib/actionResult.ts`): `run()` returns its message to the owner;
  - from `sanity/queries/newsletter.ts`: `FRESH`, `SMTP_ID`, `USAGE_ID`, `type SmtpDoc`, `getSmtpDoc()`, `getSmtpView()`, `getUsage()`;
  - from `lib/mailer.ts`: `type Mailer = { transporter; from: string; replyTo?: string; dailyLimit: number }`, `getMailer(): Promise<Mailer | null>` (throws if the saved password can't be decrypted), `addUsage(count)`, `remainingSendsToday(dailyLimit)`;
  - from `actions/newsletterAdmin.ts`: `saveSmtpSettings(input)`, `testSmtp()` returning `ActionResult<SmtpTest>`, `deleteSmtpSettings()`, `type SmtpTest = { ok: boolean; steps: string[]; message: string; detail: string }`.

- [ ] **Step 1: `ActionError` in `lib/actionResult.ts`**

Add above `export async function run`:

```ts
// A message meant for the store owner (what to fix). run() returns it as is; any other error
// becomes the generic message, so internals never reach the browser.
export class ActionError extends Error {}
```

and in `run`'s `catch`, as its first line:

```ts
    if (error instanceof ActionError) return { ok: false, error: error.message };
```

- [ ] **Step 2: Reads `sanity/queries/newsletter.ts`**

```ts
import "server-only";
import { DEFAULT_DAILY_LIMIT, EMPTY_SMTP, type SmtpSecurity, type SmtpView } from "@/lib/newsletter";
import { backendClient } from "../lib/backendClient";

// Panel and sending reads are never cached.
export const FRESH = { useCdn: false, cache: "no-store" } as const;

// Ids with a dot stay out of Sanity's public read API.
export const SMTP_ID = "config.smtp";
export const USAGE_ID = "config.smtpUsage";

export type SmtpDoc = {
  _rev: string;
  host?: string;
  port?: number;
  security?: SmtpSecurity;
  user?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  dailyLimit?: number;
};

export async function getSmtpDoc(): Promise<SmtpDoc | null> {
  return backendClient.fetch<SmtpDoc | null>(`*[_id == $id][0]`, { id: SMTP_ID }, FRESH);
}

// For the browser: the password itself never leaves the server.
export async function getSmtpView(): Promise<SmtpView> {
  const doc = await getSmtpDoc();
  if (!doc) return EMPTY_SMTP;
  return {
    host: doc.host ?? "",
    port: doc.port ?? 587,
    security: doc.security ?? "starttls",
    user: doc.user ?? "",
    hasPassword: Boolean(doc.password),
    fromName: doc.fromName ?? "",
    fromEmail: doc.fromEmail ?? "",
    replyTo: doc.replyTo ?? "",
    dailyLimit: doc.dailyLimit ?? DEFAULT_DAILY_LIMIT,
  };
}

export async function getUsage(): Promise<{ date: string; count: number } | null> {
  return backendClient.fetch<{ date: string; count: number } | null>(`*[_id == $id][0]{ date, count }`, { id: USAGE_ID }, FRESH);
}
```

- [ ] **Step 3: Transport `lib/mailer.ts`**

```ts
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { DEFAULT_DAILY_LIMIT, remainingToday, utcDay } from "@/lib/newsletter";
import { decryptSecret } from "@/lib/secrets";
import { backendClient } from "@/sanity/lib/backendClient";
import { getSmtpDoc, getUsage, USAGE_ID, type SmtpDoc } from "@/sanity/queries/newsletter";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export type Mailer = { transporter: Transporter; from: string; replyTo?: string; dailyLimit: number };

// A stuck SMTP server must not hang a request: fail fast and let the caller report it.
const TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };

let cached: { key: string; mailer: Mailer } | null = null;

const displayName = (name: string) => `"${name.replace(/["\\\r\n]/g, "")}"`;

function fromSettings(doc: SmtpDoc, storeName: string): Mailer {
  const secret = process.env.EMAIL_ENCRYPTION_KEY;
  if (doc.password && !secret) throw new Error("Falta EMAIL_ENCRYPTION_KEY para leer la contraseña del correo");
  const security = doc.security ?? "starttls";
  const transporter = nodemailer.createTransport({
    host: doc.host,
    port: doc.port ?? 587,
    secure: security === "ssl",
    requireTLS: security === "starttls",
    ignoreTLS: security === "none",
    auth: doc.user ? { user: doc.user, pass: doc.password ? decryptSecret(doc.password, secret as string) : "" } : undefined,
    ...TIMEOUTS,
  });
  return {
    transporter,
    from: `${displayName(doc.fromName || storeName)} <${doc.fromEmail}>`,
    replyTo: doc.replyTo || undefined,
    dailyLimit: doc.dailyLimit ?? DEFAULT_DAILY_LIMIT,
  };
}

// Before Ajustes → Correo existed, the SMTP_* variables were the only option.
function fromEnv(): Mailer | null {
  if (!process.env.SMTP_HOST) return null;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    ...TIMEOUTS,
  });
  return { transporter, from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "", dailyLimit: DEFAULT_DAILY_LIMIT };
}

// null = no outgoing mail configured. Throws if the saved password can't be decrypted.
// The transport is rebuilt only when the settings document changes (its _rev).
export async function getMailer(): Promise<Mailer | null> {
  const doc = await getSmtpDoc();
  const key = doc?.host ? `settings:${doc._rev}` : "env";
  if (cached?.key === key) return cached.mailer;
  const mailer = doc?.host ? fromSettings(doc, (await getSiteSettings()).storeName) : fromEnv();
  cached = mailer ? { key, mailer } : null;
  return mailer;
}

// Messages sent today (UTC day), for the campaigns' daily limit.
// ponytail: read-then-write; two sends at the same instant can lose a count. Fine for a soft limit.
export async function addUsage(count: number): Promise<void> {
  if (count <= 0) return;
  const today = utcDay();
  const usage = await getUsage();
  if (usage?.date === today) await backendClient.patch(USAGE_ID).inc({ count }).commit();
  else await backendClient.createOrReplace({ _id: USAGE_ID, _type: "smtpUsage", date: today, count });
}

export async function remainingSendsToday(dailyLimit: number): Promise<number> {
  return remainingToday(dailyLimit, await getUsage(), utcDay());
}
```

- [ ] **Step 4: Order emails use the shared transport (`lib/email.ts`)**

Replace the `import nodemailer from "nodemailer";` line and the `// Create transporter` block (`export const transporter = …;`) with:

```ts
import { addUsage, getMailer } from "@/lib/mailer";
```

Replace the body of `sendEmail` with:

```ts
export async function sendEmail(options: EmailOptions) {
  try {
    const mailer = await getMailer();
    if (!mailer) throw new Error("No hay correo de salida configurado (Ajustes → Correo o SMTP_*)");
    const info = await mailer.transporter.sendMail({ from: mailer.from, replyTo: mailer.replyTo, ...options });
    await addUsage(1).catch((error) => console.error("Could not count the sent email", error));
    return info;
  } catch (error) {
    console.error(`❌ Error sending email:`, error);
    throw error;
  }
}
```

Keep the rest of `lib/email.ts` (`emailBrand`, `EmailOptions`, both order emails) unchanged. Then run:

`grep -rn "transporter" app actions lib components --include=*.ts --include=*.tsx`

Expected: only `lib/mailer.ts` and `lib/email.ts` (`mailer.transporter`) and later newsletter files. Nothing imports the removed `transporter` export.

- [ ] **Step 5: Server actions `actions/newsletterAdmin.ts`**

```ts
"use server";

import { currentUser } from "@clerk/nextjs/server";
import { ActionError, run, type ActionResult } from "@/lib/actionResult";
import { addUsage, getMailer } from "@/lib/mailer";
import { errorDetail, smtpErrorMessage, validateSmtpSettings, type SmtpErrorInfo } from "@/lib/newsletter";
import { requirePermission } from "@/lib/roles";
import { encryptSecret } from "@/lib/secrets";
import { INVALID_FORM } from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";
import { getSmtpDoc, SMTP_ID } from "@/sanity/queries/newsletter";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

const KEY_MISSING = "Falta la clave de cifrado en el servidor (EMAIL_ENCRYPTION_KEY)";

async function sessionEmail(): Promise<string> {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) throw new ActionError("Tu cuenta no tiene un correo para recibir la prueba.");
  return email;
}

export async function saveSmtpSettings(input: unknown): Promise<ActionResult<{ hasPassword: boolean }>> {
  const allowed = await run(() => requirePermission("configurar"));
  if (!allowed.ok) return allowed;
  const stored = await run(getSmtpDoc);
  if (!stored.ok) return stored;
  const checked = validateSmtpSettings(input, { hasStoredPassword: Boolean(stored.data?.password) });
  if (!checked.ok) return { ok: false, error: INVALID_FORM, errors: checked.errors };
  const { password, ...settings } = checked.value;
  const secret = process.env.EMAIL_ENCRYPTION_KEY;
  if (password && !secret) return { ok: false, error: KEY_MISSING, errors: { password: KEY_MISSING } };
  return run(async () => {
    // An empty password keeps the saved one; no user means no login, so no password.
    const saved = !settings.user ? undefined : password ? encryptSecret(password, secret as string) : stored.data?.password;
    await backendClient.createOrReplace({ _id: SMTP_ID, _type: "smtpSettings", ...settings, ...(saved ? { password: saved } : {}) });
    return { hasPassword: Boolean(saved) };
  });
}

// Back to the SMTP_* variables (or no outgoing mail).
export async function deleteSmtpSettings(): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    await backendClient.delete(SMTP_ID);
    return null;
  });
}

export type SmtpTest = { ok: boolean; steps: string[]; message: string; detail: string };

// Uses the saved settings: connects and logs in (verify), then sends to the owner's own email.
export async function testSmtp(): Promise<ActionResult<SmtpTest>> {
  return run(async () => {
    await requirePermission("configurar");
    const to = await sessionEmail();
    let mailer;
    try {
      mailer = await getMailer();
    } catch (error) {
      return {
        ok: false,
        steps: [],
        message: "No se pudo leer la contraseña guardada. Revisa EMAIL_ENCRYPTION_KEY y vuelve a escribir la contraseña.",
        detail: errorDetail(error),
      };
    }
    if (!mailer) return { ok: false, steps: [], message: "Primero guarda la configuración del correo.", detail: "" };
    const steps: string[] = [];
    try {
      await mailer.transporter.verify();
      steps.push("Conectado al servidor", "Sesión iniciada");
      const { storeName } = await getSiteSettings();
      await mailer.transporter.sendMail({
        from: mailer.from,
        replyTo: mailer.replyTo,
        to,
        subject: `Prueba de correo de ${storeName}`,
        text: `Este es un correo de prueba de ${storeName}. Si lo recibes, el correo de salida funciona.`,
      });
      steps.push(`Correo enviado a ${to}`);
      await addUsage(1);
      return { ok: true, steps, message: "", detail: "" };
    } catch (error) {
      return { ok: false, steps, message: smtpErrorMessage(error as SmtpErrorInfo), detail: errorDetail(error) };
    }
  });
}
```

- [ ] **Step 6: Form `components/admin/newsletter/SmtpSection.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import { deleteSmtpSettings, saveSmtpSettings, testSmtp, type SmtpTest } from "@/actions/newsletterAdmin";
import { INPUT } from "@/components/admin/brand/fields";
import { SMTP_SECURITY, type SmtpSecurity, type SmtpView } from "@/lib/newsletter";

type Form = {
  host: string;
  port: string;
  security: SmtpSecurity;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  dailyLimit: string;
};

const BUTTON = "px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60";

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-xs font-semibold text-gray-700">{label}</span>
    <div className="mt-1">{children}</div>
    {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
  </label>
);

const SmtpSection = ({ initial, keyReady }: { initial: SmtpView; keyReady: boolean }) => {
  const [form, setForm] = useState<Form>({
    host: initial.host,
    port: String(initial.port),
    security: initial.security,
    user: initial.user,
    password: "",
    fromName: initial.fromName,
    fromEmail: initial.fromEmail,
    replyTo: initial.replyTo,
    dailyLimit: String(initial.dailyLimit),
  });
  const [hasPassword, setHasPassword] = useState(initial.hasPassword);
  const [saved, setSaved] = useState(Boolean(initial.host));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [test, setTest] = useState<SmtpTest | null>(null);
  const [askRemove, setAskRemove] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = (key: keyof Form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));

  const save = () =>
    startTransition(async () => {
      const result = await saveSmtpSettings(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        toast.error(result.error);
        return;
      }
      setErrors({});
      setHasPassword(result.data.hasPassword);
      setSaved(true);
      setForm((f) => ({ ...f, password: "" }));
      toast.success("Configuración del correo guardada");
    });

  const runTest = () =>
    startTransition(async () => {
      setTest(null);
      const result = await testSmtp();
      if (!result.ok) toast.error(result.error);
      else setTest(result.data);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteSmtpSettings();
      if (!result.ok) toast.error(result.error);
      else window.location.reload();
    });

  return (
    <div>
      <h3 className="font-bold text-gray-900 text-sm">Correo de salida</h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">
        Los correos de pedidos y del boletín salen por este servidor. Con Gmail usa una contraseña de aplicación; Gmail
        permite unos 500 correos al día.
      </p>
      {!keyReady && (
        <p role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Falta la clave de cifrado en el servidor (EMAIL_ENCRYPTION_KEY). Sin ella no se puede guardar la contraseña ni
          enviar campañas.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Servidor (SMTP)" error={errors.host}>
          <input value={form.host} onChange={set("host")} placeholder="smtp.gmail.com" className={INPUT} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Puerto" error={errors.port}>
            <input type="number" min={1} max={65535} value={form.port} onChange={set("port")} className={INPUT} />
          </Field>
          <Field label="Seguridad">
            <select value={form.security} onChange={set("security")} className={INPUT}>
              {(Object.keys(SMTP_SECURITY) as SmtpSecurity[]).map((key) => (
                <option key={key} value={key}>
                  {SMTP_SECURITY[key]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Usuario" error={errors.user}>
          <input value={form.user} onChange={set("user")} autoComplete="off" className={INPUT} />
        </Field>
        <Field label="Contraseña" error={errors.password}>
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
            placeholder={hasPassword ? "•••• guardada (déjala vacía para no cambiarla)" : ""}
            className={INPUT}
          />
        </Field>
        <Field label="Nombre del remitente" error={errors.fromName}>
          <input value={form.fromName} onChange={set("fromName")} placeholder="El nombre de la tienda" className={INPUT} />
        </Field>
        <Field label="Correo del remitente" error={errors.fromEmail}>
          <input type="email" value={form.fromEmail} onChange={set("fromEmail")} className={INPUT} />
        </Field>
        <Field label="Responder a (opcional)" error={errors.replyTo}>
          <input type="email" value={form.replyTo} onChange={set("replyTo")} className={INPUT} />
        </Field>
        <Field label="Tope de envíos por día" error={errors.dailyLimit}>
          <input type="number" min={1} max={100000} value={form.dailyLimit} onChange={set("dailyLimit")} className={INPUT} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button type="button" onClick={save} disabled={pending} className={`${BUTTON} bg-shop_dark_green text-white`}>
          Guardar
        </button>
        <button
          type="button"
          onClick={runTest}
          disabled={pending || !saved}
          title="Usa la configuración guardada"
          className={`${BUTTON} border border-gray-300 bg-white text-gray-700`}
        >
          Enviarme un correo de prueba
        </button>
        {saved && !askRemove && (
          <button type="button" onClick={() => setAskRemove(true)} disabled={pending} className={`${BUTTON} text-red-700`}>
            Quitar configuración
          </button>
        )}
      </div>
      {askRemove && (
        <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          ¿Quitar la configuración del correo? Los correos dejarán de salir por este servidor.
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={remove} disabled={pending} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
              Quitar
            </button>
            <button type="button" onClick={() => setAskRemove(false)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {test && (
        <div className="mt-4 rounded-xl border border-gray-200 p-3 text-sm">
          <ul className="flex flex-col gap-1">
            {test.steps.map((step) => (
              <li key={step} className="flex items-center gap-2 text-gray-800">
                <Check size={15} className="text-green-600" /> {step}
              </li>
            ))}
          </ul>
          {!test.ok && (
            <>
              <p className="flex items-center gap-2 text-red-700 mt-1">
                <X size={15} /> {test.message}
              </p>
              {test.detail && (
                <details className="mt-2 text-xs text-gray-500">
                  <summary className="cursor-pointer">Ver detalle</summary>
                  <p className="mt-1 break-all">{test.detail}</p>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SmtpSection;
```

- [ ] **Step 7: Ajustes page**

Replace `app/(admin)/admin/ajustes/page.tsx` with:

```tsx
import PageHeader from "@/components/admin/shell/PageHeader";
import CurrencySection from "@/components/admin/CurrencySection";
import SmtpSection from "@/components/admin/newsletter/SmtpSection";
import { requireSection } from "@/lib/adminAccess";
import { getSmtpView } from "@/sanity/queries/newsletter";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function SettingsPage() {
  await requireSection("ajustes");
  const [{ currency }, smtp] = await Promise.all([getSiteSettings(), getSmtpView()]);
  return (
    <>
      <PageHeader title="Ajustes" description="Opciones generales de la tienda." />
      <div className="flex flex-col gap-4 max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <CurrencySection initialCurrency={currency} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <SmtpSection initial={smtp} keyReady={Boolean(process.env.EMAIL_ENCRYPTION_KEY)} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 8: Type-check and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`, `npx eslint lib/mailer.ts lib/email.ts lib/actionResult.ts actions/newsletterAdmin.ts components/admin/newsletter "app/(admin)/admin/ajustes" sanity/queries/newsletter.ts`, `npm run -s check:permissions 2>&1 | tail -1`
Expected: no tsc or ESLint output; `check-permissions: ok`.

- [ ] **Step 9: Ethereal test mailbox and a read-only Sanity check script**

Create the test mailbox. It delivers nothing, and the credentials are written only to the git-ignored workspace:

```bash
node -e "require('nodemailer').createTestAccount().then(a => require('fs').writeFileSync('.superpowers/sdd/2026-10-07-newsletter/ethereal.json', JSON.stringify({ user: a.user, pass: a.pass, host: a.smtp.host, port: a.smtp.port })))"
```

Expected: the file exists. Do not print its contents.

Read-only check script, reused by later tasks. Save it as `.superpowers/sdd/2026-10-07-newsletter/read.mjs`:

```js
// Usage: node --env-file=.env.local .superpowers/sdd/2026-10-07-newsletter/read.mjs '<GROQ>' '<json params>'
const { createClient } = await import("@sanity/client");
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2025-03-20",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});
console.log(JSON.stringify(await client.fetch(process.argv[2], JSON.parse(process.argv[3] ?? "{}")), null, 1));
```

- [ ] **Step 10: Verify in the browser**

On `http://localhost:3000/admin/ajustes`, as superadmin:

1. A "Correo de salida" card appears under Moneda. The amber key warning is not shown, since `.env.local` has `EMAIL_ENCRYPTION_KEY`.
2. Fill in the Ethereal values with JS native value setters plus `input` events, reading the values in page JS from the workspace file content you paste into the script. Never echo them in your report.
   - Servidor = host, Puerto = port, Seguridad = STARTTLS, Usuario = user, Contraseña = pass;
   - Nombre del remitente "ZZ Tienda", Correo del remitente = user, Tope 450.
3. Guardar. Expected: the toast "Configuración del correo guardada", the password field empty with the "•••• guardada" placeholder, and `document.documentElement.outerHTML.includes(<pass>)` false.
4. "Enviarme un correo de prueba". Expected: three ✓ steps, the last "Correo enviado a <your Clerk email>".
5. Type Contraseña "zz-mala", Guardar, and test again. Expected: ✗ "Usuario o contraseña incorrectos. Si usas Gmail, usa una contraseña de aplicación." and a "Ver detalle" toggle. Put the real password back, Guardar, and test again: three ✓ steps.
6. Run `node --env-file=.env.local .superpowers/sdd/2026-10-07-newsletter/read.mjs '*[_id == "config.smtp"][0]{host, user, "pw": password}'`. Expected: `pw` starts with `v1.` and does not contain the plain password. Compare in code and print only `true`/`false`.

Leave the Ethereal settings saved: later tasks use them, and Task 9 removes them.

- [ ] **Step 11: Review Focus 3 (order flows still catch email errors)**

Run: `grep -n -B2 -A10 "sendOrderConfirmationEmail(" lib/orders.ts` and `grep -n -B4 -A10 "sendInvoiceEmail(" "app/(client)/api/admin/orders/update-status/route.ts"`
Expected: both calls sit inside a `try` whose `catch` logs and continues, so a mail failure never fails the order. Report the line numbers.

- [ ] **Step 12: Stage**

```bash
git add lib/actionResult.ts sanity/queries/newsletter.ts lib/mailer.ts lib/email.ts actions/newsletterAdmin.ts components/admin/newsletter/SmtpSection.tsx "app/(admin)/admin/ajustes/page.tsx"
```

---

### Task 5: Unsubscribe page, one-click unsubscribe, footer re-subscribe

**Files:**
- Modify: `sanity/schemaTypes/subscriberType.ts`
- Modify: `sanity/queries/newsletter.ts` (add `getSubscriberStatus`)
- Create: `lib/unsubscribe.ts`
- Create: `actions/unsubscribe.ts`
- Create: `app/(client)/api/boletin/baja/route.ts`
- Create: `app/(client)/boletin/baja/page.tsx`, `components/UnsubscribeForm.tsx`
- Modify: `actions/newsletter.ts`

**Interfaces:**
- Consumes:
  - from Task 1: `signUnsubscribe`, `verifyUnsubscribe`, `subscriberDocId`;
  - from Task 2: `isSubscriberId`, `type SubscriberStatus`;
  - from Task 4: `FRESH`.
- Produces:
  - from `sanity/queries/newsletter.ts`: `getSubscriberStatus(id): Promise<SubscriberStatus | null>`;
  - from `lib/unsubscribe.ts`:
    - `siteUrl(): string`;
    - `unsubscribeLinks(subscriberId, secret, base?)`, returning `{ page, oneClick }`;
    - `isValidUnsubscribe(id, signature): boolean`;
    - `applyUnsubscribe(id, signature): Promise<boolean>`.

- [ ] **Step 1: Subscriber fields in Studio**

In `sanity/schemaTypes/subscriberType.ts`, after the `source` field, add:

```ts
    defineField({
      name: "status",
      title: "Estado",
      type: "string",
      options: { list: [{ title: "Activo", value: "active" }, { title: "Dado de baja", value: "unsubscribed" }] },
    }),
    defineField({ name: "unsubscribedAt", title: "Fecha de baja", type: "datetime" }),
```

- [ ] **Step 2: Status read in `sanity/queries/newsletter.ts`**

Add the type import `type SubscriberStatus` to the existing `@/lib/newsletter` import, then append:

```ts
// Old documents have no status: they count as active.
export async function getSubscriberStatus(id: string): Promise<SubscriberStatus | null> {
  const doc = await backendClient.fetch<{ status: SubscriberStatus } | null>(
    `*[_id == $id][0]{ "status": coalesce(status, "active") }`,
    { id },
    FRESH
  );
  return doc?.status ?? null;
}
```

- [ ] **Step 3: `lib/unsubscribe.ts`**

```ts
import "server-only";
import { isSubscriberId } from "@/lib/newsletter";
import { signUnsubscribe, verifyUnsubscribe } from "@/lib/secrets";
import { backendClient } from "@/sanity/lib/backendClient";

export const siteUrl = (): string => (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");

// page: the store page with the "Darme de baja" button. oneClick: the List-Unsubscribe target.
export function unsubscribeLinks(subscriberId: string, secret: string, base = siteUrl()) {
  const query = `s=${encodeURIComponent(subscriberId)}&t=${signUnsubscribe(subscriberId, secret)}`;
  return { page: `${base}/boletin/baja?${query}`, oneClick: `${base}/api/boletin/baja?${query}` };
}

export function isValidUnsubscribe(subscriberId: unknown, signature: unknown): boolean {
  const secret = process.env.EMAIL_ENCRYPTION_KEY;
  return (
    Boolean(secret) &&
    isSubscriberId(subscriberId) &&
    typeof signature === "string" &&
    verifyUnsubscribe(subscriberId, signature, secret as string)
  );
}

// Same answer whether the subscriber exists, was already out or was deleted: nothing to learn.
export async function applyUnsubscribe(subscriberId: unknown, signature: unknown): Promise<boolean> {
  if (!isValidUnsubscribe(subscriberId, signature)) return false;
  try {
    await backendClient
      .patch(subscriberId as string)
      .set({ status: "unsubscribed", unsubscribedAt: new Date().toISOString() })
      .commit();
  } catch (error) {
    console.log("Unsubscribe: document not updated (it may have been deleted)", error);
  }
  return true;
}
```

- [ ] **Step 4: Public action and one-click route**

`actions/unsubscribe.ts`:

```ts
"use server";

import { applyUnsubscribe } from "@/lib/unsubscribe";

// Public: the signed link is the permission.
export async function unsubscribe(subscriberId: string, signature: string): Promise<{ ok: boolean }> {
  return { ok: await applyUnsubscribe(subscriberId, signature) };
}
```

`app/(client)/api/boletin/baja/route.ts`:

```ts
import { NextRequest } from "next/server";
import { applyUnsubscribe } from "@/lib/unsubscribe";

// One-click unsubscribe (RFC 8058): Gmail and Yahoo POST here from the List-Unsubscribe header.
export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const ok = await applyUnsubscribe(params.get("s"), params.get("t"));
  return new Response(null, { status: ok ? 200 : 400 });
}
```

- [ ] **Step 5: Unsubscribe page**

`components/UnsubscribeForm.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { unsubscribe } from "@/actions/unsubscribe";

const UnsubscribeForm = ({ subscriberId, signature, storeName }: { subscriberId: string; signature: string; storeName: string }) => {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) return <p className="text-gray-800 font-semibold">Listo, ya no recibirás correos de {storeName}.</p>;
  return (
    <>
      <h1 className="text-xl font-bold text-darkColor">¿Dejar de recibir correos de {storeName}?</h1>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await unsubscribe(subscriberId, signature);
            if (result.ok) setDone(true);
            else setFailed(true);
          })
        }
        className="btn-primary mt-6 px-5 py-2.5 rounded-lg bg-shop_btn_dark_green text-white text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Procesando…" : "Darme de baja"}
      </button>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          No pudimos procesar la baja. Intenta de nuevo.
        </p>
      )}
    </>
  );
};

export default UnsubscribeForm;
```

`app/(client)/boletin/baja/page.tsx`:

```tsx
import type { Metadata } from "next";
import Container from "@/components/Container";
import UnsubscribeForm from "@/components/UnsubscribeForm";
import { isValidUnsubscribe } from "@/lib/unsubscribe";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export const metadata: Metadata = { title: "Darse de baja", robots: { index: false, follow: false } };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const s = typeof params.s === "string" ? params.s : "";
  const t = typeof params.t === "string" ? params.t : "";
  const { storeName } = await getSiteSettings();
  return (
    <Container className="py-16">
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 p-8 text-center">
        {isValidUnsubscribe(s, t) ? (
          <UnsubscribeForm subscriberId={s} signature={t} storeName={storeName} />
        ) : (
          <p className="text-gray-700">Este enlace no es válido.</p>
        )}
      </div>
    </Container>
  );
}
```

- [ ] **Step 6: Footer re-subscribe (`actions/newsletter.ts`)**

Replace `import { createHash } from "node:crypto";` with:

```ts
import { subscriberDocId } from "@/lib/secrets";
import { getSubscriberStatus } from "@/sanity/queries/newsletter";
```

Replace the body of the `try` block with:

```ts
    const id = subscriberDocId(email);
    const now = new Date().toISOString();
    const status = await getSubscriberStatus(id);
    if (!status) {
      await backendClient.createIfNotExists({
        _id: id,
        _type: "subscriber",
        email,
        consent: true,
        subscribedAt: now,
        source: "footer",
        status: "active",
      });
    } else if (status === "unsubscribed") {
      // The person asked again from the store: a new, explicit consent.
      await backendClient
        .patch(id)
        .set({ status: "active", consent: true, subscribedAt: now, source: "footer" })
        .unset(["unsubscribedAt"])
        .commit();
    }
    return { ok: true, message: SUCCESS };
```

- [ ] **Step 7: Type-check, lint, tests**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`, `npx eslint lib/unsubscribe.ts actions/unsubscribe.ts actions/newsletter.ts components/UnsubscribeForm.tsx "app/(client)/boletin" "app/(client)/api/boletin" sanity/schemaTypes/subscriberType.ts sanity/queries/newsletter.ts`, `npm run -s check:permissions 2>&1 | tail -1`
Expected: no tsc or ESLint output; `check-permissions: ok`.

- [ ] **Step 8: Verify in the browser**

1. On `http://localhost:3000/`, in the footer newsletter form, subscribe `zz-baja@example.com` with the consent box checked. Expected: "¡Listo! Te suscribiste".
2. Build its signed link, printing only the URL path:

   ```bash
   node --env-file=.env.local --experimental-strip-types --input-type=module -e "const s = await import('./lib/secrets.ts'); const id = s.subscriberDocId('zz-baja@example.com'); console.log('/boletin/baja?s=' + id + '&t=' + s.signUnsubscribe(id, process.env.EMAIL_ENCRYPTION_KEY))"
   ```
3. Open `http://localhost:3000<that path>`. Expected: "¿Dejar de recibir correos de {tienda}?". Click "Darme de baja". Expected: "Listo, ya no recibirás correos de {tienda}."
4. Run `read.mjs '*[email == "zz-baja@example.com"][0]{status, unsubscribedAt, source}'`. Expected: `status` is `unsubscribed` and `unsubscribedAt` is set.
5. Open the same path with the last character of `t` changed. Expected: "Este enlace no es válido."
6. Subscribe `zz-baja@example.com` again from the footer, then read it. Expected: `status` is `active`, `unsubscribedAt` is gone and `source` is `footer`.
7. One click: `curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/boletin/baja?s=<id>&t=<sig>"`. Expected: `200`, and reading the document shows `status: unsubscribed`. With a bad signature, expected `400`.

Leave `zz-baja@example.com` as unsubscribed: Task 6 uses it, and Task 9 deletes it.

- [ ] **Step 9: Stage**

```bash
git add sanity/schemaTypes/subscriberType.ts sanity/queries/newsletter.ts lib/unsubscribe.ts actions/unsubscribe.ts actions/newsletter.ts "app/(client)/api/boletin/baja/route.ts" "app/(client)/boletin/baja/page.tsx" components/UnsubscribeForm.tsx
```

---

### Task 6: Boletín section and the Suscriptores tab

**Files:**
- Modify: `lib/permissions.ts:17-26,88-98` (section `boletin`)
- Modify: `components/admin/shell/nav.ts`
- Modify: `scripts/check-permissions.mjs` (`ALL_SECTIONS`)
- Modify: `sanity/queries/newsletter.ts` (subscriber reads)
- Modify: `actions/newsletterAdmin.ts` (subscriber actions)
- Create: `app/(admin)/admin/boletin/page.tsx`
- Create: `components/admin/newsletter/SubscribersTab.tsx`, `SubscriberTools.tsx`, `DeleteSubscriberButton.tsx`

**Interfaces:**
- Consumes:
  - from Task 2: `PAGE_SIZE`, `MAX_IMPORT_ROWS`, `STATUS_LABELS`, `SOURCE_LABELS`, `isEmail`, `isSubscriberId`, `parseEmailCsv`, `planImport`, `subscribersCsv`, `readSubscriberFilters`, `type SubscriberRow`, `type SubscriberFilters`, `type SubscriberStatus`;
  - from Task 1: `subscriberDocId`;
  - from Task 4: `FRESH`, `ActionError`;
  - from Task 5: `getSubscriberStatus`.
- Produces:
  - from `sanity/queries/newsletter.ts`:
    - `getSubscriberPage(filters)`, returning `{ rows: SubscriberRow[]; total: number }`;
    - `getSubscriberCounts()`, returning `{ active: number; unsubscribed: number }`;
    - `getAllSubscribers()`, `getSubscriberStatuses(emails)`, `countActiveSubscribers()`;
  - from `actions/newsletterAdmin.ts`:
    - `addSubscriber(input)`, returning `ActionResult<"created" | "exists" | "unsubscribed">`;
    - `previewImport(emails)` and `importSubscribers({ emails, consent })`, both returning `ActionResult<ImportCounts>`;
    - `deleteSubscriber(id)`, `exportSubscribers()` (returns `ActionResult<string>`);
    - `type ImportCounts = { create: number; already: number; skippedUnsubscribed: number }`;
  - the page `/admin/boletin`, which Task 7 adds tabs to.

- [ ] **Step 1: Write the failing test**

In `scripts/check-permissions.mjs`, change the `ALL_SECTIONS` line to:

```js
const ALL_SECTIONS = ["inicio", "pedidos", "productos", "categorias", "marcas", "apariencia", "paginas", "boletin", "usuarios", "ajustes"];
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL with an `AssertionError` on `adminSections("superadmin")`.

- [ ] **Step 3: Section and menu**

In `lib/permissions.ts`, add `| "boletin"` to `AdminSection` after `| "paginas"`, and in `SECTION_PERMISSION` add `boletin: "configurar",` right after `paginas: "configurar",`.

In `components/admin/shell/nav.ts`:
- add `Mail,` to the lucide import (alphabetical, after `LayoutDashboard,`);
- add `boletin: "/admin/boletin",` to `SECTION_PATHS` after `paginas`;
- add `{ section: "boletin", label: "Boletín", icon: Mail },` to the "Tienda" group after the Páginas item.

Run: `npm run -s check:permissions 2>&1 | tail -1`
Expected: `check-permissions: ok`

- [ ] **Step 4: Subscriber reads (`sanity/queries/newsletter.ts`)**

Extend the `@/lib/newsletter` import with `PAGE_SIZE, type SubscriberFilters, type SubscriberRow`, then append:

```ts
const ACTIVE = `coalesce(status, "active") == "active"`;
const SUBSCRIBER_ROW = `{ _id, email, subscribedAt, "source": coalesce(source, "footer"), "status": coalesce(status, "active") }`;

export async function getSubscriberCounts(): Promise<{ active: number; unsubscribed: number }> {
  return backendClient.fetch(
    `{ "active": count(*[_type == "subscriber" && ${ACTIVE}]), "unsubscribed": count(*[_type == "subscriber" && status == "unsubscribed"]) }`,
    {},
    FRESH
  );
}

export async function countActiveSubscribers(): Promise<number> {
  return backendClient.fetch<number>(`count(*[_type == "subscriber" && ${ACTIVE}])`, {}, FRESH);
}

export async function getSubscriberPage({ search, status, page }: SubscriberFilters): Promise<{ rows: SubscriberRow[]; total: number }> {
  const filter = `_type == "subscriber"${status === "all" ? "" : ` && coalesce(status, "active") == $status`}`;
  const start = page * PAGE_SIZE;
  if (!search) {
    return backendClient.fetch(
      `{ "rows": *[${filter}] | order(subscribedAt desc) [$start...$end] ${SUBSCRIBER_ROW}, "total": count(*[${filter}]) }`,
      { status, start, end: start + PAGE_SIZE },
      FRESH
    );
  }
  // GROQ has no substring search on strings: filter the emails here.
  // ponytail: loads every matching row per search; fine for a few tens of thousands of subscribers.
  const all = await backendClient.fetch<SubscriberRow[]>(`*[${filter}] | order(subscribedAt desc) ${SUBSCRIBER_ROW}`, { status }, FRESH);
  const found = all.filter((row) => row.email.includes(search));
  return { rows: found.slice(start, start + PAGE_SIZE), total: found.length };
}

export async function getAllSubscribers(): Promise<SubscriberRow[]> {
  return backendClient.fetch<SubscriberRow[]>(`*[_type == "subscriber"] | order(subscribedAt desc) ${SUBSCRIBER_ROW}`, {}, FRESH);
}

export async function getSubscriberStatuses(emails: string[]): Promise<{ email: string; status: SubscriberStatus }[]> {
  if (emails.length === 0) return [];
  return backendClient.fetch(`*[_type == "subscriber" && email in $emails]{ email, "status": coalesce(status, "active") }`, { emails }, FRESH);
}
```

- [ ] **Step 5: Subscriber actions (`actions/newsletterAdmin.ts`)**

Extend the imports:

```ts
import { isEmail, isSubscriberId, MAX_IMPORT_ROWS, planImport, subscribersCsv } from "@/lib/newsletter";
import { subscriberDocId } from "@/lib/secrets";
import { getAllSubscribers, getSubscriberStatus, getSubscriberStatuses } from "@/sanity/queries/newsletter";
```

Merge these into the existing import lines from the same modules; do not duplicate a module import. Then append:

```ts
const PERMISSION_ONE = "Confirma que tienes permiso de esta persona para enviarle correos";
const PERMISSION_MANY = "Confirma que tienes permiso de estas personas para enviarles correos";
const BAD_LIST = "La lista de correos no es válida";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function newSubscriber(email: string, source: "manual" | "import", now: string) {
  return { _id: subscriberDocId(email), _type: "subscriber", email, consent: true, subscribedAt: now, source, status: "active" };
}

export async function addSubscriber(input: unknown): Promise<ActionResult<"created" | "exists" | "unsubscribed">> {
  const v = asRecord(input);
  const email = typeof v.email === "string" ? v.email.trim().toLowerCase() : "";
  const errors: Record<string, string> = {};
  if (!isEmail(email)) errors.email = "Ingresa un correo válido";
  if (v.consent !== true) errors.consent = PERMISSION_ONE;
  if (Object.keys(errors).length > 0) return { ok: false, error: INVALID_FORM, errors };
  return run(async () => {
    await requirePermission("configurar");
    const status = await getSubscriberStatus(subscriberDocId(email));
    // Never re-activates someone who unsubscribed: only they can, from the store.
    if (status) return status === "unsubscribed" ? "unsubscribed" : "exists";
    await backendClient.createIfNotExists(newSubscriber(email, "manual", new Date().toISOString()));
    return "created";
  });
}

export type ImportCounts = { create: number; already: number; skippedUnsubscribed: number };

function cleanEmails(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length > MAX_IMPORT_ROWS) return null;
  const emails = [...new Set(input.map((e) => (typeof e === "string" ? e.trim().toLowerCase() : "")))];
  return emails.every(isEmail) ? emails : null;
}

async function importPlan(emails: string[]) {
  const found = await getSubscriberStatuses(emails);
  return planImport(emails, Object.fromEntries(found.map((s) => [s.email, s.status])));
}

export async function previewImport(input: unknown): Promise<ActionResult<ImportCounts>> {
  const emails = cleanEmails(input);
  if (!emails) return { ok: false, error: BAD_LIST };
  return run(async () => {
    await requirePermission("configurar");
    const plan = await importPlan(emails);
    return { create: plan.create.length, already: plan.already, skippedUnsubscribed: plan.skippedUnsubscribed };
  });
}

export async function importSubscribers(input: unknown): Promise<ActionResult<ImportCounts>> {
  const v = asRecord(input);
  const emails = cleanEmails(v.emails);
  if (!emails) return { ok: false, error: BAD_LIST };
  if (v.consent !== true) return { ok: false, error: PERMISSION_MANY, errors: { consent: PERMISSION_MANY } };
  return run(async () => {
    await requirePermission("configurar");
    const plan = await importPlan(emails);
    const now = new Date().toISOString();
    // ponytail: 200 documents per transaction keeps each request small; 5000 rows = 25 requests.
    for (let i = 0; i < plan.create.length; i += 200) {
      const tx = backendClient.transaction();
      for (const email of plan.create.slice(i, i + 200)) tx.createIfNotExists(newSubscriber(email, "import", now));
      await tx.commit();
    }
    return { create: plan.create.length, already: plan.already, skippedUnsubscribed: plan.skippedUnsubscribed };
  });
}

// Right to deletion (Ley 1581): the data goes; if they subscribe again they start as new.
export async function deleteSubscriber(id: string): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    if (!isSubscriberId(id)) throw new ActionError("Suscriptor no encontrado");
    await backendClient.delete(id);
    return null;
  });
}

export async function exportSubscribers(): Promise<ActionResult<string>> {
  return run(async () => {
    await requirePermission("configurar");
    return subscribersCsv(await getAllSubscribers());
  });
}
```

- [ ] **Step 6: Delete button `components/admin/newsletter/DeleteSubscriberButton.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteSubscriber } from "@/actions/newsletterAdmin";

const DeleteSubscriberButton = ({ id }: { id: string }) => {
  const [ask, setAsk] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!ask)
    return (
      <button type="button" onClick={() => setAsk(true)} className="text-xs font-semibold text-red-700">
        Borrar
      </button>
    );
  return (
    <span role="alert" className="inline-flex flex-wrap items-center gap-2 text-xs text-red-900">
      Se borran sus datos. Si vuelve a suscribirse entrará como nuevo.
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteSubscriber(id);
            if (!result.ok) toast.error(result.error);
            else router.refresh();
          })
        }
        className="rounded bg-red-600 px-2 py-1 font-semibold text-white disabled:opacity-60"
      >
        Borrar
      </button>
      <button type="button" onClick={() => setAsk(false)} className="font-semibold">
        Cancelar
      </button>
    </span>
  );
};

export default DeleteSubscriberButton;
```

- [ ] **Step 7: Add / import / export `components/admin/newsletter/SubscriberTools.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { addSubscriber, exportSubscribers, importSubscribers, previewImport, type ImportCounts } from "@/actions/newsletterAdmin";
import { INPUT } from "@/components/admin/brand/fields";
import { parseEmailCsv } from "@/lib/newsletter";

type Panel = "add" | "import" | null;
type Summary = ImportCounts & { emails: string[]; invalid: string[]; duplicates: number };

const BUTTON = "px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-60";
const ADD_MESSAGES = {
  created: "Suscriptor agregado",
  exists: "Ese correo ya estaba en la lista",
  unsubscribed: "Ese correo se dio de baja: solo puede volver a suscribirse desde la tienda",
} as const;

const SubscriberTools = () => {
  const [panel, setPanel] = useState<Panel>(null);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fileError, setFileError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const open = (next: Panel) => {
    setPanel(panel === next ? null : next);
    setConsent(false);
    setErrors({});
    setSummary(null);
    setFileError("");
  };

  const add = () =>
    startTransition(async () => {
      const result = await addSubscriber({ email, consent });
      if (!result.ok) {
        setErrors(result.errors ?? {});
        if (!result.errors) toast.error(result.error);
        return;
      }
      setErrors({});
      toast[result.data === "created" ? "success" : "error"](ADD_MESSAGES[result.data]);
      if (result.data === "created") {
        setEmail("");
        setConsent(false);
        router.refresh();
      }
    });

  const readFile = (file: File) =>
    startTransition(async () => {
      setSummary(null);
      setFileError("");
      const parsed = parseEmailCsv(await file.text());
      if (!parsed.ok) {
        setFileError(parsed.error);
        return;
      }
      const result = await previewImport(parsed.emails);
      if (!result.ok) {
        setFileError(result.error);
        return;
      }
      setSummary({ ...result.data, emails: parsed.emails, invalid: parsed.invalid, duplicates: parsed.duplicates });
    });

  const runImport = () =>
    startTransition(async () => {
      if (!summary) return;
      const result = await importSubscribers({ emails: summary.emails, consent });
      if (!result.ok) {
        setErrors(result.errors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(`${result.data.create} suscriptores importados`);
      open(null);
      router.refresh();
    });

  const download = () =>
    startTransition(async () => {
      const result = await exportSubscribers();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const url = URL.createObjectURL(new Blob([result.data], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `suscriptores-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => open("add")} className={BUTTON}>
          Agregar
        </button>
        <button type="button" onClick={() => open("import")} className={BUTTON}>
          Importar CSV
        </button>
        <button type="button" onClick={download} disabled={pending} className={BUTTON}>
          Exportar CSV
        </button>
      </div>

      {panel === "add" && (
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" aria-label="Correo" className={INPUT} />
          {errors.email && <span className="text-xs text-red-600">{errors.email}</span>}
          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            Tengo permiso de esta persona para enviarle correos
          </label>
          {errors.consent && <span className="text-xs text-red-600">{errors.consent}</span>}
          <button type="button" onClick={add} disabled={pending} className="self-start px-3 py-1.5 rounded-lg bg-shop_dark_green text-white text-xs font-semibold disabled:opacity-60">
            Agregar suscriptor
          </button>
        </div>
      )}

      {panel === "import" && (
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-2 text-sm">
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Archivo CSV"
            onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
            className="text-xs"
          />
          <p className="text-xs text-gray-500">Una columna llamada email o correo (separada por coma o punto y coma). Máximo 5000 filas.</p>
          {fileError && <p role="alert" className="text-xs text-red-600">{fileError}</p>}
          {summary && (
            <>
              <ul className="text-xs text-gray-700 list-disc pl-4">
                <li>{summary.create} nuevos</li>
                <li>{summary.already} ya estaban</li>
                <li>{summary.skippedUnsubscribed} omitidos por estar dados de baja</li>
                <li>{summary.invalid.length} inválidos{summary.invalid.length > 0 && `: ${summary.invalid.slice(0, 10).join(", ")}`}</li>
                <li>{summary.duplicates} repetidos en el archivo</li>
              </ul>
              <label className="flex items-start gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                Tengo permiso de estas personas para enviarles correos
              </label>
              {errors.consent && <span className="text-xs text-red-600">{errors.consent}</span>}
              <button
                type="button"
                onClick={runImport}
                disabled={pending || summary.create === 0}
                className="self-start px-3 py-1.5 rounded-lg bg-shop_dark_green text-white text-xs font-semibold disabled:opacity-60"
              >
                Importar {summary.create}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriberTools;
```

- [ ] **Step 8: Tab and page**

`components/admin/newsletter/SubscribersTab.tsx`:

```tsx
import Link from "next/link";
import { PAGE_SIZE, SOURCE_LABELS, STATUS_LABELS, type SubscriberFilters } from "@/lib/newsletter";
import { getSubscriberCounts, getSubscriberPage } from "@/sanity/queries/newsletter";
import DeleteSubscriberButton from "./DeleteSubscriberButton";
import SubscriberTools from "./SubscriberTools";

const FILTERS = [
  ["all", "Todos"],
  ["active", "Activos"],
  ["unsubscribed", "Dados de baja"],
] as const;

export default async function SubscribersTab({ filters }: { filters: SubscriberFilters }) {
  const [counts, { rows, total }] = await Promise.all([getSubscriberCounts(), getSubscriberPage(filters)]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (patch: { estado?: string; pagina?: number }) => {
    const params = new URLSearchParams({ tab: "suscriptores" });
    const estado = patch.estado ?? filters.status;
    const pagina = patch.pagina ?? filters.page + 1;
    if (filters.search) params.set("q", filters.search);
    if (estado !== "all") params.set("estado", estado);
    if (pagina > 1) params.set("pagina", String(pagina));
    return `/admin/boletin?${params}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
            <p className="text-xs text-gray-500">Activos</p>
            <p className="text-xl font-bold text-gray-900">{counts.active}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
            <p className="text-xs text-gray-500">Dados de baja</p>
            <p className="text-xl font-bold text-gray-900">{counts.unsubscribed}</p>
          </div>
        </div>
        <SubscriberTools />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <form action="/admin/boletin" className="flex gap-2">
            <input type="hidden" name="tab" value="suscriptores" />
            {filters.status !== "all" && <input type="hidden" name="estado" value={filters.status} />}
            <input
              name="q"
              defaultValue={filters.search}
              placeholder="Buscar por correo"
              aria-label="Buscar por correo"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
            <button type="submit" className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-semibold">
              Buscar
            </button>
          </form>
          <div className="flex gap-1">
            {FILTERS.map(([key, label]) => (
              <Link
                key={key}
                href={href({ estado: key, pagina: 1 })}
                aria-current={filters.status === key ? "page" : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filters.status === key ? "bg-shop_dark_green text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            {filters.search || filters.status !== "all" ? "No hay suscriptores con ese filtro." : "Todavía no hay suscriptores."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-2 pr-3 font-semibold">Correo</th>
                  <th className="py-2 pr-3 font-semibold">Fecha</th>
                  <th className="py-2 pr-3 font-semibold">Origen</th>
                  <th className="py-2 pr-3 font-semibold">Estado</th>
                  <th className="py-2 font-semibold sr-only">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-gray-100">
                    <td className="py-2 pr-3 text-gray-900 break-all">{row.email}</td>
                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{row.subscribedAt ? new Date(row.subscribedAt).toLocaleDateString("es-CO") : "—"}</td>
                    <td className="py-2 pr-3 text-gray-600">{SOURCE_LABELS[row.source]}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${row.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <DeleteSubscriberButton id={row._id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between mt-3 text-sm">
            {filters.page > 0 ? <Link href={href({ pagina: filters.page })}>← Anterior</Link> : <span />}
            <span className="text-gray-500">
              Página {filters.page + 1} de {pages}
            </span>
            {filters.page + 1 < pages ? <Link href={href({ pagina: filters.page + 2 })}>Siguiente →</Link> : <span />}
          </div>
        )}
      </div>
    </div>
  );
}
```

`app/(admin)/admin/boletin/page.tsx`:

```tsx
import PageHeader from "@/components/admin/shell/PageHeader";
import SubscribersTab from "@/components/admin/newsletter/SubscribersTab";
import { requireSection } from "@/lib/adminAccess";
import { readSubscriberFilters } from "@/lib/newsletter";

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSection("boletin");
  const params = await searchParams;
  return (
    <>
      <PageHeader title="Boletín" description="Tus suscriptores y las campañas que les envías." />
      <SubscribersTab filters={readSubscriberFilters(params)} />
    </>
  );
}
```

- [ ] **Step 9: Type-check, lint, tests and browser**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`, `npx eslint lib/permissions.ts components/admin/shell/nav.ts components/admin/newsletter "app/(admin)/admin/boletin" actions/newsletterAdmin.ts sanity/queries/newsletter.ts`, `npm run -s check:permissions 2>&1 | tail -1`
Expected: no tsc or ESLint output; `check-permissions: ok`.

Browser, `http://localhost:3000/admin/boletin`:

1. The sidebar shows "Boletín" under Tienda. The page shows the counts and the table. `zz-baja@example.com` (from Task 5) shows as "Dado de baja".
2. Agregar `zz-manual@example.com` without the box. Expected: "Confirma que tienes permiso de esta persona para enviarle correos". With the box: the toast "Suscriptor agregado" and the row appears with origin "Manual". Add it again: "Ese correo ya estaba en la lista". Add `zz-baja@example.com`: "Ese correo se dio de baja: solo puede volver a suscribirse desde la tienda".
3. Importar CSV. Build the file in page JS and set it on the input with `DataTransfer`, then dispatch `change`. Content:

   ```
   ﻿Nombre;Correo
   "ZZ, Ana";zz-imp1@example.com
   ZZ Luis;ZZ-IMP2@example.com
   repetido;zz-imp1@example.com
   malo;no-es-correo
   baja;zz-baja@example.com
   ya;zz-manual@example.com
   ```

   Expected summary: 2 nuevos, 1 ya estaban, 1 omitidos por estar dados de baja, 1 inválidos (no-es-correo) and 1 repetidos. "Importar 2" without the box shows the permission error; with the box the toast reads "2 suscriptores importados" and both rows show "Importado".
4. Buscar `zz-imp`. Expected: exactly those 2 rows. The filter "Dados de baja" shows only `zz-baja@example.com`.
5. Exportar CSV without downloading a file. Before clicking, in page JS:
   - wrap `URL.createObjectURL` to keep the Blob;
   - stub `HTMLAnchorElement.prototype.click` to do nothing;
   - after the click, read the Blob text and restore both.

   Expected: it starts with the BOM plus `email,fecha,origen,estado` and contains `zz-imp1@example.com` with `Importado,Activo`.
6. Borrar `zz-imp2@example.com`: confirm. Expected: the row disappears.

- [ ] **Step 10: 5001-row file is rejected before anything is written (Review Focus 4)**

Build `email` plus 5001 `zz-big{i}@example.com` rows in page JS and set them on the file input. Expected: "Divide el archivo en partes de 5000"; no summary and no server call.

Leave the ZZ subscribers: Task 8 sends to them and Task 9 deletes them.

- [ ] **Step 11: Stage**

```bash
git add lib/permissions.ts components/admin/shell/nav.ts scripts/check-permissions.mjs sanity/queries/newsletter.ts actions/newsletterAdmin.ts "app/(admin)/admin/boletin/page.tsx" components/admin/newsletter/SubscribersTab.tsx components/admin/newsletter/SubscriberTools.tsx components/admin/newsletter/DeleteSubscriberButton.tsx
```

---

### Task 7: Campaigns — list, editor, preview, test send

**Files:**
- Modify: `sanity/queries/newsletter.ts` (campaign and product reads)
- Create: `lib/campaignSend.ts` (brand, products, readiness; Task 8 adds `runBatch`)
- Modify: `actions/newsletterAdmin.ts` (campaign actions)
- Create: `components/admin/newsletter/CampaignsTab.tsx`, `NewCampaignButton.tsx`, `ProductPicker.tsx`, `CampaignEditor.tsx`
- Modify: `app/(admin)/admin/boletin/page.tsx` (tabs)
- Create: `app/(admin)/admin/boletin/[id]/page.tsx`

**Interfaces:**
- Consumes:
  - from Task 2: `validateCampaign`, `isCampaignId`, `EMPTY_CAMPAIGN`, `CAMPAIGN_STATUS_LABELS`, `MAX_CAMPAIGN_PRODUCTS`, `smtpErrorMessage`, `type CampaignContent`, `type CampaignProgress`, `type CampaignFailure`, `type SendReadiness`;
  - from Task 3: `renderCampaignEmail`, `type EmailBrand`, `type EmailProduct`;
  - from Task 4: `getMailer`, `addUsage`, `remainingSendsToday`, `ActionError`;
  - from Task 5: `siteUrl`;
  - from Task 6: `countActiveSubscribers`;
  - existing: `formatPrice`, `THEMES`, `getSiteSettings`, `TextField`, `useAutosave`, `draftSaves`, `ImageField`.
- Produces:
  - from `sanity/queries/newsletter.ts`:
    - `type CampaignDoc = { _id; _rev; content: CampaignContent; progress: CampaignProgress; cursor: string; failures: CampaignFailure[]; startedAt: string | null; finishedAt: string | null }`;
    - `getCampaign(docId)`, `getCampaignRows()`, `type CampaignRow`;
    - `getProductsByIds(ids)`, `searchProductDocs(term)`, `type EmailProductDoc`;
  - from `lib/campaignSend.ts`:
    - `type PickerProduct = EmailProduct & { _id: string }`;
    - `getEmailBrand()`, returning `{ brand: EmailBrand; currency }`;
    - `loadEmailProducts(ids, currency)`, returning `PickerProduct[]`;
    - `sendReadiness(address)`, returning `SendReadiness & { remaining: number }`;
  - from `actions/newsletterAdmin.ts`:
    - `createCampaign()`, `saveCampaign(id, input)`, `duplicateCampaign(id)`, `deleteCampaign(id)`;
    - `searchCampaignProducts(term)`, `sendCampaignTest(id)`;
    - `findCampaign(id)` (internal);
  - from `components/admin/newsletter/CampaignEditor.tsx`: a default export with props `{ id, initial, initialProducts, missing, progress, failures, brand, baseUrl, ready }`. Task 8 adds the send panel to it.

- [ ] **Step 1: Campaign and product reads (`sanity/queries/newsletter.ts`)**

Extend the `@/lib/newsletter` import with `type CampaignContent, type CampaignFailure, type CampaignProgress, type CampaignStatus, type PauseReason`, add `import type { Cta, ImageValue } from "@/lib/brand";`, and append:

```ts
type CampaignRaw = {
  _id: string;
  _rev: string;
  _createdAt?: string;
  subject?: string;
  preheader?: string;
  image?: ImageValue | null;
  title?: string;
  text?: string;
  button?: Partial<Cta> | null;
  products?: (string | null)[] | null;
  status?: CampaignStatus;
  pauseReason?: PauseReason | null;
  pauseMessage?: string;
  cursor?: string;
  total?: number;
  sent?: number;
  failed?: number;
  failures?: CampaignFailure[] | null;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type CampaignDoc = {
  _id: string;
  _rev: string;
  content: CampaignContent;
  progress: CampaignProgress;
  cursor: string;
  failures: CampaignFailure[];
  startedAt: string | null;
  finishedAt: string | null;
};

const CAMPAIGN = `{ _id, _rev, _createdAt, subject, preheader, image, title, text, button, "products": products[]._ref,
  status, pauseReason, pauseMessage, cursor, total, sent, failed, failures, startedAt, finishedAt }`;

function toCampaign(raw: CampaignRaw): CampaignDoc {
  return {
    _id: raw._id,
    _rev: raw._rev,
    content: {
      subject: raw.subject ?? "",
      preheader: raw.preheader ?? "",
      image: raw.image?.assetId && raw.image.url ? { assetId: raw.image.assetId, url: raw.image.url } : null,
      title: raw.title ?? "",
      text: raw.text ?? "",
      button: { label: raw.button?.label ?? "", href: raw.button?.href ?? "" },
      products: (raw.products ?? []).filter((id): id is string => typeof id === "string"),
    },
    progress: {
      status: raw.status ?? "draft",
      total: raw.total ?? 0,
      sent: raw.sent ?? 0,
      failed: raw.failed ?? 0,
      pauseReason: raw.pauseReason ?? null,
      pauseMessage: raw.pauseMessage ?? "",
    },
    cursor: raw.cursor ?? "",
    failures: raw.failures ?? [],
    startedAt: raw.startedAt ?? null,
    finishedAt: raw.finishedAt ?? null,
  };
}

export async function getCampaign(docId: string): Promise<CampaignDoc | null> {
  const raw = await backendClient.fetch<CampaignRaw | null>(`*[_id == $id][0]${CAMPAIGN}`, { id: docId }, FRESH);
  return raw ? toCampaign(raw) : null;
}

export type CampaignRow = { id: string; subject: string; progress: CampaignProgress; date: string };

export async function getCampaignRows(): Promise<CampaignRow[]> {
  const raws = await backendClient.fetch<CampaignRaw[]>(`*[_type == "campaign"] | order(_createdAt desc) ${CAMPAIGN}`, {}, FRESH);
  return raws.map((raw) => {
    const campaign = toCampaign(raw);
    return {
      id: raw._id.slice("campaign.".length),
      subject: campaign.content.subject,
      progress: campaign.progress,
      date: raw.finishedAt ?? raw.startedAt ?? raw._createdAt ?? "",
    };
  });
}

export type EmailProductDoc = { _id: string; name: string; price: number | null; slug: string | null; image: string | null };
const PUBLISHED_PRODUCT = `_type == "product" && archived != true && !(_id in path("drafts.**")) && !(_id in path("versions.**"))`;
const PRODUCT_FIELDS = `{ _id, name, price, "slug": slug.current, "image": images[0].asset->url }`;

// Deleted or archived products simply don't come back.
export async function getProductsByIds(ids: string[]): Promise<EmailProductDoc[]> {
  if (ids.length === 0) return [];
  return backendClient.fetch(`*[${PUBLISHED_PRODUCT} && _id in $ids]${PRODUCT_FIELDS}`, { ids }, FRESH);
}

export async function searchProductDocs(term: string): Promise<EmailProductDoc[]> {
  const filter = term ? `${PUBLISHED_PRODUCT} && name match $q` : PUBLISHED_PRODUCT;
  return backendClient.fetch(`*[${filter}] | order(name asc) [0...10]${PRODUCT_FIELDS}`, { q: `${term}*` }, FRESH);
}
```

- [ ] **Step 2: `lib/campaignSend.ts` (brand, products, readiness)**

```ts
import "server-only";
import { formatPrice, type CurrencyCode } from "@/constants/currencies";
import { THEMES } from "@/constants/themes";
import type { EmailBrand, EmailProduct } from "@/lib/campaignEmail";
import { getMailer, remainingSendsToday } from "@/lib/mailer";
import type { SendReadiness } from "@/lib/newsletter";
import { siteUrl } from "@/lib/unsubscribe";
import { countActiveSubscribers, getProductsByIds, type EmailProductDoc } from "@/sanity/queries/newsletter";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export type PickerProduct = EmailProduct & { _id: string };

// The store's look for emails: published settings (logo, palette with custom colors, address).
export async function getEmailBrand(): Promise<{ brand: EmailBrand; currency: CurrencyCode }> {
  const s = await getSiteSettings();
  const palette = THEMES[s.theme];
  return {
    brand: {
      storeName: s.storeName,
      logoUrl: s.logoType === "image" && s.logoImage ? s.logoImage.url : null,
      address: s.contact.address,
      primary: s.styles.colors.primary ?? palette.primary,
      button: s.styles.colors.button ?? palette.primaryBtn,
    },
    currency: s.currency,
  };
}

export const toPickerProduct = (doc: EmailProductDoc, currency: CurrencyCode): PickerProduct => ({
  _id: doc._id,
  name: doc.name,
  url: doc.slug ? `/product/${doc.slug}` : "/shop",
  imageUrl: doc.image,
  price: formatPrice(doc.price, currency),
});

// In the campaign's order; ids of deleted or archived products are left out.
export async function loadEmailProducts(ids: string[], currency: CurrencyCode): Promise<PickerProduct[]> {
  const docs = await getProductsByIds(ids);
  const byId = new Map(docs.map((doc) => [doc._id, doc]));
  return ids.flatMap((id) => {
    const doc = byId.get(id);
    return doc ? [toPickerProduct(doc, currency)] : [];
  });
}

export async function sendReadiness(address: string): Promise<SendReadiness & { remaining: number }> {
  const mailer = await getMailer().catch(() => null);
  const [activeCount, remaining] = await Promise.all([
    countActiveSubscribers(),
    mailer ? remainingSendsToday(mailer.dailyLimit) : Promise.resolve(0),
  ]);
  return {
    smtpReady: Boolean(mailer),
    keyReady: Boolean(process.env.EMAIL_ENCRYPTION_KEY),
    baseUrl: siteUrl(),
    address,
    activeCount,
    remaining,
  };
}
```

- [ ] **Step 3: Campaign actions (`actions/newsletterAdmin.ts`)**

Extend the imports, merging with existing lines from the same modules:

```ts
import { renderCampaignEmail } from "@/lib/campaignEmail";
import { getEmailBrand, loadEmailProducts, toPickerProduct, type PickerProduct } from "@/lib/campaignSend";
import { EMPTY_CAMPAIGN, isCampaignId, validateCampaign, type CampaignContent } from "@/lib/newsletter";
import { siteUrl } from "@/lib/unsubscribe";
import { getCampaign, searchProductDocs, type CampaignDoc } from "@/sanity/queries/newsletter";
```

Append:

```ts
const CAMPAIGN_NOT_FOUND = "Campaña no encontrada";

async function findCampaign(id: string): Promise<CampaignDoc> {
  if (!isCampaignId(id)) throw new ActionError(CAMPAIGN_NOT_FOUND);
  const campaign = await getCampaign(`campaign.${id}`);
  if (!campaign) throw new ActionError(CAMPAIGN_NOT_FOUND);
  return campaign;
}

// How content is stored: products as weak references, so deleting a product never fails.
function campaignFields(content: CampaignContent) {
  return {
    subject: content.subject,
    preheader: content.preheader,
    image: content.image,
    title: content.title,
    text: content.text,
    button: content.button,
    products: content.products.map((id) => ({ _key: id, _type: "reference", _ref: id, _weak: true })),
  };
}

async function createDraft(content: CampaignContent): Promise<string> {
  const id = crypto.randomUUID();
  await backendClient.create({
    _id: `campaign.${id}`,
    _type: "campaign",
    ...campaignFields(content),
    status: "draft",
    cursor: "",
    total: 0,
    sent: 0,
    failed: 0,
    failures: [],
  });
  return id;
}

export async function createCampaign(): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    await requirePermission("configurar");
    return { id: await createDraft(EMPTY_CAMPAIGN) };
  });
}

export async function saveCampaign(id: string, input: unknown): Promise<ActionResult<null>> {
  const checked = validateCampaign(input);
  if (!checked.ok) return { ok: false, error: INVALID_FORM, errors: checked.errors };
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    if (campaign.progress.status !== "draft") throw new ActionError("Esta campaña ya no se puede editar; duplícala para cambiarla");
    await backendClient.patch(campaign._id).set(campaignFields(checked.value)).commit();
    return null;
  });
}

export async function duplicateCampaign(id: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    return { id: await createDraft(campaign.content) };
  });
}

export async function deleteCampaign(id: string): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    if (campaign.progress.status === "sending") throw new ActionError("Pausa el envío antes de borrar la campaña");
    await backendClient.delete(campaign._id);
    return null;
  });
}

export async function searchCampaignProducts(term: string): Promise<ActionResult<PickerProduct[]>> {
  return run(async () => {
    await requirePermission("configurar");
    const clean = (typeof term === "string" ? term : "").trim().slice(0, 60);
    const [{ currency }, docs] = await Promise.all([getEmailBrand(), searchProductDocs(clean)]);
    return docs.map((doc) => toPickerProduct(doc, currency));
  });
}

// The saved draft, to the owner's own email. Does not touch the campaign's state or progress.
export async function sendCampaignTest(id: string): Promise<ActionResult<{ to: string }>> {
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    const to = await sessionEmail();
    const mailer = await getMailer().catch(() => null);
    if (!mailer) throw new ActionError("Configura el correo de salida en Ajustes → Correo.");
    const { brand, currency } = await getEmailBrand();
    const products = await loadEmailProducts(campaign.content.products, currency);
    const email = renderCampaignEmail({ content: campaign.content, products, brand, baseUrl: siteUrl(), unsubscribeUrl: `${siteUrl()}/boletin/baja` });
    try {
      await mailer.transporter.sendMail({ from: mailer.from, replyTo: mailer.replyTo, to, subject: `[Prueba] ${email.subject}`, html: email.html, text: email.text });
    } catch (error) {
      throw new ActionError(smtpErrorMessage(error as SmtpErrorInfo));
    }
    await addUsage(1);
    return { to };
  });
}
```

- [ ] **Step 4: List `CampaignsTab.tsx` and `NewCampaignButton.tsx`**

`components/admin/newsletter/NewCampaignButton.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createCampaign } from "@/actions/newsletterAdmin";

const NewCampaignButton = () => {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await createCampaign();
          if (!result.ok) toast.error(result.error);
          else router.push(`/admin/boletin/${result.data.id}`);
        })
      }
      className="px-4 py-2 rounded-lg bg-shop_orange text-white text-sm font-semibold disabled:opacity-60"
    >
      Nueva campaña
    </button>
  );
};

export default NewCampaignButton;
```

`components/admin/newsletter/CampaignsTab.tsx`:

```tsx
import Link from "next/link";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/newsletter";
import { getCampaignRows } from "@/sanity/queries/newsletter";
import NewCampaignButton from "./NewCampaignButton";

export default async function CampaignsTab() {
  const rows = await getCampaignRows();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewCampaignButton />
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Todavía no hay campañas.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={`/admin/boletin/${row.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:bg-gray-50 rounded-lg px-2">
                  <span className="flex-1 min-w-0 truncate font-semibold text-gray-900">{row.subject || "Sin asunto"}</span>
                  <span className="text-xs font-semibold rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">{CAMPAIGN_STATUS_LABELS[row.progress.status]}</span>
                  {row.progress.status !== "draft" && (
                    <span className="text-xs text-gray-500">
                      {row.progress.sent + row.progress.failed} de {row.progress.total}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{row.date ? new Date(row.date).toLocaleDateString("es-CO") : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Tabs on `app/(admin)/admin/boletin/page.tsx`**

Replace the file with:

```tsx
import Link from "next/link";
import PageHeader from "@/components/admin/shell/PageHeader";
import CampaignsTab from "@/components/admin/newsletter/CampaignsTab";
import SubscribersTab from "@/components/admin/newsletter/SubscribersTab";
import { requireSection } from "@/lib/adminAccess";
import { readSubscriberFilters } from "@/lib/newsletter";

const TABS = [
  ["suscriptores", "Suscriptores"],
  ["campanas", "Campañas"],
] as const;

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSection("boletin");
  const params = await searchParams;
  const tab = params.tab === "campanas" ? "campanas" : "suscriptores";
  return (
    <>
      <PageHeader title="Boletín" description="Tus suscriptores y las campañas que les envías." />
      <nav aria-label="Partes del boletín" className="flex gap-1 mb-4">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/boletin?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold ${tab === key ? "bg-shop_dark_green text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "campanas" ? <CampaignsTab /> : <SubscribersTab filters={readSubscriberFilters(params)} />}
    </>
  );
}
```

- [ ] **Step 6: `components/admin/newsletter/ProductPicker.tsx`**

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { searchCampaignProducts } from "@/actions/newsletterAdmin";
import { INPUT } from "@/components/admin/brand/fields";
import type { PickerProduct } from "@/lib/campaignSend";
import { MAX_CAMPAIGN_PRODUCTS } from "@/lib/newsletter";

const ICON = "p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30";

const ProductPicker = ({
  chosen,
  missing,
  disabled,
  onChange,
}: {
  chosen: PickerProduct[];
  missing: string[];
  disabled: boolean;
  onChange: (chosen: PickerProduct[], missing: string[]) => void;
}) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [, startTransition] = useTransition();
  const full = chosen.length + missing.length >= MAX_CAMPAIGN_PRODUCTS;

  useEffect(() => {
    if (disabled) return;
    const timer = setTimeout(
      () =>
        startTransition(async () => {
          const result = await searchCampaignProducts(term);
          if (result.ok) setResults(result.data);
        }),
      300
    );
    return () => clearTimeout(timer);
  }, [term, disabled]);

  const move = (i: number, step: -1 | 1) => {
    const next = [...chosen];
    const [item] = next.splice(i, 1);
    next.splice(i + step, 0, item);
    onChange(next, missing);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-700">
        Productos (hasta {MAX_CAMPAIGN_PRODUCTS})
      </span>
      {chosen.map((product, i) => (
        <div key={product._id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-sm">
          <span className="flex-1 min-w-0 truncate">{product.name}</span>
          <span className="text-xs text-gray-500">{product.price}</span>
          <button type="button" aria-label="Subir" disabled={disabled || i === 0} onClick={() => move(i, -1)} className={ICON}>
            <ChevronUp size={15} />
          </button>
          <button type="button" aria-label="Bajar" disabled={disabled || i === chosen.length - 1} onClick={() => move(i, 1)} className={ICON}>
            <ChevronDown size={15} />
          </button>
          <button type="button" aria-label="Quitar" disabled={disabled} onClick={() => onChange(chosen.filter((p) => p._id !== product._id), missing)} className={ICON}>
            <X size={15} />
          </button>
        </div>
      ))}
      {missing.map((id) => (
        <div key={id} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-sm text-amber-900">
          <span className="flex-1">Ya no existe</span>
          <button type="button" disabled={disabled} onClick={() => onChange(chosen, missing.filter((m) => m !== id))} className="text-xs font-semibold">
            Quitar
          </button>
        </div>
      ))}
      {!disabled && !full && (
        <>
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar productos" aria-label="Buscar productos" className={INPUT} />
          <ul className="flex flex-col">
            {results
              .filter((r) => !chosen.some((c) => c._id === r._id))
              .map((product) => (
                <li key={product._id}>
                  <button
                    type="button"
                    onClick={() => onChange([...chosen, product], missing)}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="flex-1 min-w-0 truncate">{product.name}</span>
                    <span className="text-xs text-gray-500">{product.price}</span>
                    <span className="text-xs font-semibold text-shop_dark_green">Agregar</span>
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default ProductPicker;
```

- [ ] **Step 7: `components/admin/newsletter/CampaignEditor.tsx`**

```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteCampaign, duplicateCampaign, saveCampaign, sendCampaignTest } from "@/actions/newsletterAdmin";
import ImageField from "@/components/admin/brand/ImageField";
import { draftSaves, TextField, useAutosave } from "@/components/admin/brand/fields";
import { renderCampaignEmail, type EmailBrand } from "@/lib/campaignEmail";
import type { PickerProduct } from "@/lib/campaignSend";
import {
  CAMPAIGN_STATUS_LABELS,
  validateCampaign,
  type CampaignContent,
  type CampaignFailure,
  type CampaignProgress,
  type SendReadiness,
} from "@/lib/newsletter";
import ProductPicker from "./ProductPicker";

export type EditorProps = {
  id: string;
  initial: CampaignContent;
  initialProducts: PickerProduct[];
  missing: string[];
  progress: CampaignProgress;
  failures: CampaignFailure[];
  brand: EmailBrand;
  baseUrl: string;
  ready: SendReadiness & { remaining: number };
};

const CampaignEditor = ({ id, initial, initialProducts, missing: initialMissing, progress, brand, baseUrl }: EditorProps) => {
  const [content, setContent] = useState(initial);
  const [chosen, setChosen] = useState(initialProducts);
  const [missing, setMissing] = useState(initialMissing);
  const [saveFailed, setSaveFailed] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const editable = progress.status === "draft";

  const save = useAutosave(content, validateCampaign, (value) => saveCampaign(id, value), {
    onSaved: () => setSaveFailed(false),
    onError: () => setSaveFailed(true),
  });
  const set = <K extends keyof CampaignContent>(key: K, value: CampaignContent[K]) => setContent((c) => ({ ...c, [key]: value }));
  const setProducts = (nextChosen: PickerProduct[], nextMissing: string[]) => {
    setChosen(nextChosen);
    setMissing(nextMissing);
    set("products", [...nextChosen.map((p) => p._id), ...nextMissing]);
  };

  const preview = useMemo(
    () => renderCampaignEmail({ content, products: chosen, brand, baseUrl, unsubscribeUrl: `${baseUrl}/boletin/baja` }).html,
    [content, chosen, brand, baseUrl]
  );

  const test = () =>
    startTransition(async () => {
      await draftSaves.flush();
      const result = await sendCampaignTest(id);
      if (!result.ok) toast.error(result.error);
      else toast.success(`Prueba enviada a ${result.data.to}`);
    });
  const duplicate = () =>
    startTransition(async () => {
      const result = await duplicateCampaign(id);
      if (!result.ok) toast.error(result.error);
      else router.push(`/admin/boletin/${result.data.id}`);
    });
  const remove = () =>
    startTransition(async () => {
      const result = await deleteCampaign(id);
      if (!result.ok) toast.error(result.error);
      else router.push("/admin/boletin?tab=campanas");
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl shadow-sm px-4 py-2.5">
        <h1 className="text-lg font-bold text-shop_dark_green mr-2">Campaña</h1>
        <span className="text-xs font-semibold rounded-full bg-gray-100 text-gray-700 px-2.5 py-1">{CAMPAIGN_STATUS_LABELS[progress.status]}</span>
        {editable && (
          <span className="text-xs text-gray-500">
            {save.pending ? "Guardando…" : Object.keys(save.errors).length > 0 ? "Sin guardar: revisa los campos" : "Borrador guardado"}
          </span>
        )}
        <div className="flex-1" />
        <button type="button" onClick={test} disabled={pending} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-60">
          Enviarme una prueba
        </button>
        <button type="button" onClick={duplicate} disabled={pending} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-60">
          Duplicar
        </button>
        {progress.status !== "sending" && (
          <button type="button" onClick={() => setAskDelete(true)} disabled={pending} className="px-3 py-2 rounded-lg text-sm font-semibold text-red-700">
            Borrar
          </button>
        )}
      </div>
      {askDelete && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          ¿Borrar esta campaña?
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={remove} disabled={pending} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
              Borrar
            </button>
            <button type="button" onClick={() => setAskDelete(false)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {saveFailed && (
        <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          No se pudo guardar el borrador. Se intentará de nuevo con tu próximo cambio.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
          <fieldset disabled={!editable} className="flex flex-col gap-3 disabled:opacity-70">
            <TextField label="Asunto" value={content.subject} onChange={(v) => set("subject", v)} error={save.errors.subject} max={150} />
            <TextField label="Texto de vista previa (bandeja de entrada)" value={content.preheader} onChange={(v) => set("preheader", v)} error={save.errors.preheader} max={150} />
            <ImageField label="Imagen principal (opcional)" value={content.image} onChange={(v) => set("image", v)} error={save.errors.image} />
            <TextField label="Título" value={content.title} onChange={(v) => set("title", v)} error={save.errors.title} max={120} />
            <TextField label="Texto (deja una línea en blanco entre párrafos)" multiline value={content.text} onChange={(v) => set("text", v)} error={save.errors.text} max={3000} />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Botón: texto" value={content.button.label} onChange={(v) => set("button", { ...content.button, label: v })} error={save.errors["button.label"]} max={30} />
              <TextField label="Enlace" placeholder="/shop" value={content.button.href} onChange={(v) => set("button", { ...content.button, href: v })} error={save.errors["button.href"]} max={200} />
            </div>
          </fieldset>
          <ProductPicker chosen={chosen} missing={missing} disabled={!editable} onChange={setProducts} />
          {save.errors.products && <span className="text-xs text-red-600">{save.errors.products}</span>}
        </div>
        <div className="flex justify-center">
          <iframe
            title="Vista previa del correo"
            srcDoc={preview}
            sandbox=""
            className="w-full max-w-[640px] min-h-[760px] bg-white rounded-2xl shadow-md border border-black/5"
          />
        </div>
      </div>
    </div>
  );
};

export default CampaignEditor;
```

`ImageField` is a client component that already handles disabled state through its parent `fieldset` (native `disabled` reaches its buttons).

- [ ] **Step 8: Editor page `app/(admin)/admin/boletin/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import CampaignEditor from "@/components/admin/newsletter/CampaignEditor";
import { requireSection } from "@/lib/adminAccess";
import { getEmailBrand, loadEmailProducts, sendReadiness } from "@/lib/campaignSend";
import { isCampaignId } from "@/lib/newsletter";
import { getCampaign } from "@/sanity/queries/newsletter";

// Each send batch is a server action from this page: up to 20 SMTP messages per request.
export const maxDuration = 60;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("boletin");
  const { id } = await params;
  if (!isCampaignId(id)) notFound();
  const campaign = await getCampaign(`campaign.${id}`);
  if (!campaign) notFound();
  const { brand, currency } = await getEmailBrand();
  const [products, ready] = await Promise.all([loadEmailProducts(campaign.content.products, currency), sendReadiness(brand.address)]);
  const missing = campaign.content.products.filter((pid) => !products.some((p) => p._id === pid));
  return (
    <>
      <Link href="/admin/boletin?tab=campanas" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-shop_dark_green mb-3">
        <ChevronLeft size={16} /> Campañas
      </Link>
      <CampaignEditor
        id={id}
        initial={campaign.content}
        initialProducts={products}
        missing={missing}
        progress={campaign.progress}
        failures={campaign.failures}
        brand={brand}
        baseUrl={ready.baseUrl}
        ready={ready}
      />
    </>
  );
}
```

- [ ] **Step 9: Type-check, lint, tests and browser**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`, `npx eslint components/admin/newsletter "app/(admin)/admin/boletin" lib/campaignSend.ts actions/newsletterAdmin.ts sanity/queries/newsletter.ts`, `npm run -s check:permissions 2>&1 | tail -1`
Expected: no tsc or ESLint output; `check-permissions: ok`.

Browser:

1. `/admin/boletin?tab=campanas` shows "Todavía no hay campañas." Click "Nueva campaña": you land on `/admin/boletin/<uuid>` with status Borrador.
2. Type Asunto "ZZ Ofertas", Título "ZZ Hola", Texto "ZZ uno<b>x</b>\n\nZZ dos", Botón "Ver" → `/shop`. Expected:
   - "Guardando…" then "Borrador guardado";
   - in the preview iframe (`document.querySelector('iframe').contentDocument`), the title, two `<p>` paragraphs where `<b>x</b>` shows as text, and the button "Ver";
   - the footer with the store name and "Darte de baja".
3. Search a product, add 2 of them, and move the second up. Expected: the preview grid shows both in the new order with prices.
4. Type Enlace `javascript:alert(1)` as text, without clicking it. Expected: "Usa una ruta que empiece por / o un enlace https://", "Sin guardar: revisa los campos" and no "Guardando…". Put `/shop` back.
5. "Enviarme una prueba". Expected: the toast "Prueba enviada a <your email>" (through Ethereal).
6. Reload: everything typed is still there.
7. "Duplicar" opens a new draft with the same content. "Borrar" on the copy, then confirm, returns to the list, and only the original remains.
8. Review Focus 5, read-only (no product is archived or deleted for the test):
   - Get one published product id: `read.mjs '*[_type=="product" && archived != true && !(_id in path("drafts.**"))][0]._id'`.
   - Get one archived product id, if any: `read.mjs '*[_type=="product" && archived == true][0]._id'`.
   - Run the exact `getProductsByIds` query with both ids plus `"zz-no-existe"`:

     ```
     read.mjs '*[_type == "product" && archived != true && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && _id in $ids]{ _id }' '{"ids": ["<published>", "<archived>", "zz-no-existe"]}'
     ```
   - Expected: only the published id comes back. The editor page lists every id missing from that result as "Ya no existe" (`missing` in `[id]/page.tsx`), and `loadEmailProducts` leaves it out of the email. Report whether an archived product existed to test with.

Leave the "ZZ Ofertas" draft for Task 8.

- [ ] **Step 10: Stage**

```bash
git add sanity/queries/newsletter.ts lib/campaignSend.ts actions/newsletterAdmin.ts components/admin/newsletter/CampaignsTab.tsx components/admin/newsletter/NewCampaignButton.tsx components/admin/newsletter/ProductPicker.tsx components/admin/newsletter/CampaignEditor.tsx "app/(admin)/admin/boletin/page.tsx" "app/(admin)/admin/boletin/[id]/page.tsx"
```

---

### Task 8: Sending — start, batches, pause, continue

**Files:**
- Modify: `sanity/queries/newsletter.ts` (`getNextBatch`)
- Modify: `lib/campaignSend.ts` (`runBatch`)
- Modify: `actions/newsletterAdmin.ts` (`startCampaign`, `sendCampaignBatch`, `pauseCampaign`)
- Create: `components/admin/newsletter/CampaignSendPanel.tsx`
- Modify: `components/admin/newsletter/CampaignEditor.tsx` (mount the panel, lock the form)

**Interfaces:**
- Consumes:
  - from Task 2: `batchSize`, `isRecipientError`, `smtpErrorMessage`, `errorDetail`, `MAX_FAILURES`, `campaignSendProblems`, `progressPercent`, `type CampaignProgress`, `type PauseReason`, `type SmtpErrorInfo`;
  - from Task 3: `renderCampaignEmail`;
  - from Task 4: `getMailer`, `addUsage`, `remainingSendsToday`, `ActionError`;
  - from Task 5: `unsubscribeLinks`, `siteUrl`;
  - from Task 7: `getCampaign`, `type CampaignDoc`, `getEmailBrand`, `loadEmailProducts`, `sendReadiness`, `findCampaign`.
- Produces:
  - `getNextBatch(cursor, n)`, returning `{ _id, email }[]`;
  - `runBatch(campaign: CampaignDoc): Promise<CampaignProgress>`;
  - `startCampaign(id)`, `sendCampaignBatch(id)`, `pauseCampaign(id)`, each returning `ActionResult<CampaignProgress>`.

- [ ] **Step 1: Next batch read (`sanity/queries/newsletter.ts`)**

```ts
// Always the same order (by _id), so a campaign resumes exactly after its cursor.
export async function getNextBatch(cursor: string, limit: number): Promise<{ _id: string; email: string }[]> {
  return backendClient.fetch(
    `*[_type == "subscriber" && ${ACTIVE} && _id > $cursor] | order(_id asc) [0...$limit]{ _id, email }`,
    { cursor, limit },
    FRESH
  );
}
```

- [ ] **Step 2: `runBatch` in `lib/campaignSend.ts`**

Extend the imports:

```ts
import { ActionError } from "@/lib/actionResult";
import { renderCampaignEmail } from "@/lib/campaignEmail";
import { addUsage, type Mailer } from "@/lib/mailer";
import { batchSize, errorDetail, isRecipientError, MAX_FAILURES, smtpErrorMessage, type CampaignProgress, type PauseReason, type SmtpErrorInfo } from "@/lib/newsletter";
import { unsubscribeLinks } from "@/lib/unsubscribe";
import { backendClient } from "@/sanity/lib/backendClient";
import { getCampaign, getNextBatch, type CampaignDoc } from "@/sanity/queries/newsletter";
```

Merge these with the existing imports from the same modules. Then append:

```ts
const OTHER_TAB = "Otra pestaña está enviando esta campaña";
const isConflict = (error: unknown) => (error as { statusCode?: number } | null)?.statusCode === 409;

async function pauseWith(campaign: CampaignDoc, reason: PauseReason, message: string): Promise<CampaignProgress> {
  await backendClient.patch(campaign._id).set({ status: "paused", pauseReason: reason, pauseMessage: message }).commit();
  return { ...campaign.progress, status: "paused", pauseReason: reason, pauseMessage: message };
}

async function latest(campaign: CampaignDoc): Promise<CampaignProgress> {
  return (await getCampaign(campaign._id))?.progress ?? campaign.progress;
}

// One batch of up to 20. A batch only changes the status to paused (limit or SMTP) or sent;
// if the owner paused meanwhile, it stays paused.
export async function runBatch(campaign: CampaignDoc): Promise<CampaignProgress> {
  if (campaign.progress.status !== "sending") return campaign.progress;
  const secret = process.env.EMAIL_ENCRYPTION_KEY;
  const base = siteUrl();
  const mailer: Mailer | null = await getMailer().catch(() => null);
  if (!mailer || !secret || !base) return pauseWith(campaign, "smtp", "El correo de salida no está configurado. Revisa Ajustes → Correo.");

  const take = batchSize(await remainingSendsToday(mailer.dailyLimit));
  if (take === 0) return pauseWith(campaign, "limit", `Llegaste al tope de hoy (${mailer.dailyLimit}). Continúa mañana.`);

  const batch = await getNextBatch(campaign.cursor, take);
  if (batch.length === 0) {
    await backendClient.patch(campaign._id).set({ status: "sent", finishedAt: new Date().toISOString() }).unset(["pauseReason", "pauseMessage"]).commit();
    return { ...campaign.progress, status: "sent", pauseReason: null, pauseMessage: "" };
  }

  // Reserve the batch before sending: a second tab gets a revision conflict instead of
  // sending the same people. If the page dies mid-batch, those reserved and not sent are lost
  // (up to 20): repeating emails would hurt the sender's reputation more.
  try {
    await backendClient.patch(campaign._id).ifRevisionId(campaign._rev).set({ cursor: batch[batch.length - 1]._id }).commit();
  } catch (error) {
    if (!isConflict(error)) throw error;
    const now = await getCampaign(campaign._id);
    if (now && now.progress.status !== "sending") return now.progress;
    throw new ActionError(OTHER_TAB);
  }

  const { brand, currency } = await getEmailBrand();
  const products = await loadEmailProducts(campaign.content.products, currency);
  const failures = [...campaign.failures];
  let sent = 0;
  let failed = 0;
  let lastDone = campaign.cursor;
  for (const subscriber of batch) {
    const links = unsubscribeLinks(subscriber._id, secret, base);
    const email = renderCampaignEmail({ content: campaign.content, products, brand, baseUrl: base, unsubscribeUrl: links.page });
    try {
      await mailer.transporter.sendMail({
        from: mailer.from,
        replyTo: mailer.replyTo,
        to: subscriber.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: { "List-Unsubscribe": `<${links.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      sent++;
    } catch (error) {
      if (!isRecipientError(error as SmtpErrorInfo)) {
        // The server itself failed: give back the untouched part of the batch and pause.
        await backendClient
          .patch(campaign._id)
          .inc({ sent, failed })
          .set({ cursor: lastDone, failures: failures.slice(-MAX_FAILURES), status: "paused", pauseReason: "smtp", pauseMessage: smtpErrorMessage(error as SmtpErrorInfo) })
          .commit();
        await addUsage(sent);
        return latest(campaign);
      }
      failed++;
      failures.push({ email: subscriber.email, error: errorDetail(error) });
    }
    lastDone = subscriber._id;
  }
  await backendClient.patch(campaign._id).inc({ sent, failed }).set({ failures: failures.slice(-MAX_FAILURES) }).commit();
  await addUsage(sent);
  return latest(campaign);
}
```

- [ ] **Step 3: Actions (`actions/newsletterAdmin.ts`)**

Extend the imports, merging with existing lines:

```ts
import { runBatch, sendReadiness } from "@/lib/campaignSend";
import { campaignSendProblems, type CampaignProgress } from "@/lib/newsletter";
```

Append:

```ts
// Draft: starts from the first subscriber. Paused (or left "sending" by a closed page): resumes.
export async function startCampaign(id: string): Promise<ActionResult<CampaignProgress>> {
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    const { status } = campaign.progress;
    if (status === "sent") throw new ActionError("Esta campaña ya se envió");
    const { brand } = await getEmailBrand();
    const ready = await sendReadiness(brand.address);
    // On resume, an empty list just lets the next batch mark the campaign as sent.
    const problems = campaignSendProblems(campaign.content, status === "draft" ? ready : { ...ready, activeCount: Math.max(ready.activeCount, 1) });
    if (problems.length > 0) throw new ActionError(problems[0]);
    const patch = backendClient.patch(campaign._id).set({ status: "sending" }).unset(["pauseReason", "pauseMessage"]);
    if (status === "draft") {
      patch.set({ cursor: "", total: ready.activeCount, sent: 0, failed: 0, failures: [], startedAt: new Date().toISOString() });
    }
    await patch.commit();
    return (await findCampaign(id)).progress;
  });
}

export async function sendCampaignBatch(id: string): Promise<ActionResult<CampaignProgress>> {
  return run(async () => {
    await requirePermission("configurar");
    return runBatch(await findCampaign(id));
  });
}

export async function pauseCampaign(id: string): Promise<ActionResult<CampaignProgress>> {
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    if (campaign.progress.status === "sending") {
      await backendClient.patch(campaign._id).set({ status: "paused", pauseReason: "user", pauseMessage: "En pausa" }).commit();
    }
    return (await findCampaign(id)).progress;
  });
}
```

- [ ] **Step 4: `components/admin/newsletter/CampaignSendPanel.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pauseCampaign, sendCampaignBatch, startCampaign } from "@/actions/newsletterAdmin";
import { draftSaves } from "@/components/admin/brand/fields";
import type { ActionResult } from "@/lib/actionResult";
import {
  campaignSendProblems,
  progressPercent,
  type CampaignContent,
  type CampaignFailure,
  type CampaignProgress,
  type SendReadiness,
} from "@/lib/newsletter";

const LEFT_OPEN = "El envío quedó a medias (se cerró la página). Pulsa Continuar para seguir.";

const CampaignSendPanel = ({
  id,
  content,
  ready,
  initialProgress,
  failures,
  onLock,
}: {
  id: string;
  content: CampaignContent;
  ready: SendReadiness & { remaining: number };
  initialProgress: CampaignProgress;
  failures: CampaignFailure[];
  onLock: () => void;
}) => {
  // A campaign left in "sending" with no tab sending (page closed) shows as paused.
  const [progress, setProgress] = useState<CampaignProgress>(
    initialProgress.status === "sending" ? { ...initialProgress, status: "paused", pauseReason: "user", pauseMessage: LEFT_OPEN } : initialProgress
  );
  const [running, setRunning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const stop = useRef(false);
  const router = useRouter();
  const problems = campaignSendProblems(content, progress.status === "draft" ? ready : { ...ready, activeCount: Math.max(ready.activeCount, 1) });

  const loop = async (first: () => Promise<ActionResult<CampaignProgress>>) => {
    setRunning(true);
    setError("");
    stop.current = false;
    onLock();
    let result = await first();
    while (result.ok) {
      setProgress(result.data);
      if (result.data.status !== "sending" || stop.current) break;
      result = await sendCampaignBatch(id);
    }
    if (!result.ok) setError(`${result.error}. Pulsa Continuar para reintentar.`);
    setRunning(false);
    router.refresh(); // failures list from the server
  };

  const start = () => {
    setConfirming(false);
    void loop(async () => {
      await draftSaves.flush();
      return startCampaign(id);
    });
  };
  const pause = async () => {
    stop.current = true;
    const result = await pauseCampaign(id);
    if (result.ok) setProgress(result.data);
  };

  const done = progress.sent + progress.failed;
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 text-sm">
      {progress.status === "draft" ? (
        problems.length > 0 ? (
          <ul className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 list-disc pl-6">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : confirming ? (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            Se enviará a {ready.activeCount} suscriptores activos. Hoy quedan {ready.remaining} envíos
            {ready.activeCount > ready.remaining ? "; el resto sigue mañana" : ""}.
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={start} className="rounded-lg bg-shop_orange px-3 py-1.5 text-xs font-semibold text-white">
                Enviar
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="self-start px-4 py-2 rounded-lg bg-shop_orange text-white font-semibold">
            Enviar a {ready.activeCount} suscriptores
          </button>
        )
      ) : (
        <>
          <div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={progressPercent(done, progress.total)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-shop_dark_green" style={{ width: `${progressPercent(done, progress.total)}%` }} />
            </div>
            <p className="mt-1 text-gray-700">
              {Math.min(done, progress.total)} de {progress.total} · Enviados: {progress.sent} · Fallidos: {progress.failed}
            </p>
          </div>
          {running ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-gray-600">No cierres esta página: el envío sigue mientras esté abierta.</p>
              <button type="button" onClick={pause} className="px-3 py-1.5 rounded-lg border border-gray-300 font-semibold">
                Pausar
              </button>
            </div>
          ) : progress.status === "paused" ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-gray-700">{progress.pauseMessage || "En pausa"}</p>
              <button
                type="button"
                onClick={() => void loop(() => startCampaign(id))}
                disabled={problems.length > 0}
                className="px-3 py-1.5 rounded-lg bg-shop_orange text-white font-semibold disabled:opacity-60"
              >
                Continuar
              </button>
            </div>
          ) : progress.status === "sent" ? (
            <p className="font-semibold text-green-700">Campaña enviada.</p>
          ) : null}
          {!running && progress.status === "paused" && problems.length > 0 && (
            <ul className="text-xs text-amber-900 list-disc pl-5">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {failures.length > 0 && (
        <details>
          <summary className="cursor-pointer text-gray-700">Ver fallidos ({failures.length})</summary>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-gray-600">
            {failures.map((f, i) => (
              <li key={`${f.email}-${i}`} className="break-all">
                {f.email}: {f.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default CampaignSendPanel;
```

- [ ] **Step 5: Mount it in `CampaignEditor.tsx`**

- Add `import CampaignSendPanel from "./CampaignSendPanel";`.
- Destructure `failures` and `ready` from the props (they are already in `EditorProps`).
- Replace `const editable = progress.status === "draft";` with:

  ```tsx
  const [locked, setLocked] = useState(progress.status !== "draft");
  const editable = !locked;
  ```
- Right before the closing `</div>` of the left column (after the products error line), add:

  ```tsx
            <CampaignSendPanel id={id} content={content} ready={ready} initialProgress={progress} failures={failures} onLock={() => setLocked(true)} />
  ```

- [ ] **Step 6: Type-check, lint, tests**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`, `npx eslint components/admin/newsletter lib/campaignSend.ts actions/newsletterAdmin.ts sanity/queries/newsletter.ts`, `npm run -s check:permissions 2>&1 | tail -1`
Expected: no tsc or ESLint output; `check-permissions: ok`.

- [ ] **Step 7: Full send, pause and continue (Review Focus 1)**

Setup:
- Run `read.mjs 'count(*[_type=="subscriber" && coalesce(status,"active")=="active" && !(email match "zz-*")])'`. If it is above 0, the store has real subscribers. They are sent to through Ethereal, which delivers nothing, so no real email goes out. Report the count anyway.
- Several batches need more than 40 active subscribers. In Suscriptores → Importar CSV (same file-input method as Task 6), import `email` plus `zz-send0@example.com` to `zz-send44@example.com` with consent. Expected: "45 suscriptores importados".
- In Ajustes → Correo set the Tope to 2000 and Guardar, so the test sends of this task never hit the daily limit by accident. Step 9 sets it back to 450.

On the "ZZ Ofertas" draft from Task 7:
1. "Enviar a N suscriptores", then Enviar. Expected: the bar advances in steps of 20 and "No cierres esta página…" plus Pausar appear.
2. Press Pausar after the first batch. Expected: "En pausa" with Continuar. Read the campaign with `read.mjs '*[_type=="campaign" && subject=="ZZ Ofertas"][0]{status, cursor, sent, failed, total}'`: `status` is `paused`, `sent` is a multiple of 20, and `cursor` is the `_id` of the last reserved subscriber.
3. Press Continuar. Expected: it finishes, shows "Campaña enviada." and `sent + failed == total`. The form is locked and Duplicar is available.

- [ ] **Step 8: Closed page and two tabs (Review Focus 1)**

1. Duplicate the campaign, send it, and reload the page while it shows Enviando, after the first batch completes. Expected: after the reload, "El envío quedó a medias (se cerró la página). Pulsa Continuar para seguir." with Continuar.
2. Open the same campaign in a second tab. Press Continuar in tab A, and right away Continuar in tab B. Expected:
   - one tab shows "Otra pestaña está enviando esta campaña. Pulsa Continuar para reintentar.", or both proceed alternately;
   - at the end `sent + failed == total`.
3. Count with the read script: `count(*[_type=="subscriber" && coalesce(status,"active")=="active"])` must equal `total` from the start, unless subscribers changed during the run.

- [ ] **Step 9: Unsubscribe during a send, and the daily limit (Review Focus 2)**

1. In Ajustes → Correo set the Tope to the number already used today plus 3: read `config.smtpUsage` first.
2. Duplicate and send. Expected: after 3 messages, "Llegaste al tope de hoy (…). Continúa mañana." with status `paused` and `pauseReason` `limit`.
3. While it is paused, unsubscribe one ZZ subscriber whose `_id` is after the cursor, by POST to the one-click URL built as in Task 5. Compute the ids with `subscriberDocId` for the `zz-send…` addresses and compare them with the cursor in code. Raise the Tope to 2000, Guardar, and Continuar. Expected:
   - it finishes;
   - the unsubscribed subscriber was not sent to, because `sent + failed` equals `total` minus 1 and the read script shows `status` `unsubscribed` for that subscriber;
   - the campaign's progress never counted them.
4. Set the Tope back to 450.

- [ ] **Step 10: SMTP failure pauses the campaign**

1. In Ajustes, set the Contraseña to "zz-mala" and Guardar.
2. Duplicate and send. Expected: "Usuario o contraseña incorrectos…" as the pause message, `sent` 0 and `cursor` unchanged.
3. Restore the password, Continuar, and expect it to complete.

- [ ] **Step 11: Stage**

```bash
git add sanity/queries/newsletter.ts lib/campaignSend.ts actions/newsletterAdmin.ts components/admin/newsletter/CampaignSendPanel.tsx components/admin/newsletter/CampaignEditor.tsx
```

---

### Task 9: Full verification and cleanup

**Files:** none new (fix-ups only if a check fails).

- [ ] **Step 1: Static checks**

Run:
```bash
npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"
npm run -s check:permissions 2>&1 | tail -1
npx eslint lib actions components/admin/newsletter components/UnsubscribeForm.tsx app sanity/queries 2>&1 | tail -5
```
Expected: no tsc output and `check-permissions: ok`. ESLint shows only the pre-existing `components/admin/UsersTab.tsx` `react-hooks/set-state-in-effect` error, if that path is included.

- [ ] **Step 2: Production build**

Stop the dev server on port 3000, then:
```bash
STRIPE_SECRET_KEY=sk_test_placeholder npm run build
```
Expected: exit 0. Then restart `npx next dev -p 3000`.

- [ ] **Step 3: Anonymous access**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/boletin` and the same for `/admin/boletin/3f2b8c1e-9a4d-4e2f-8b1a-2c3d4e5f6a7b`.
Expected: `307` for both.

- [ ] **Step 4: Clean up test data through the panel**

1. **Campaigns:** delete every "ZZ …" campaign with Borrar in the editor. A campaign still marked Enviando hides Borrar: press Continuar, then Pausar, then Borrar.
2. **Subscribers:** in Suscriptores, search `zz-` and delete each row with Borrar, then the confirming Borrar. About 48 rows: drive it with one page-JS loop that clicks the first row's Borrar, then the confirm, waits for the row count to drop, and repeats. Stop when the page shows "No hay suscriptores con ese filtro." Return only the number deleted.
3. **Mail settings:** Ajustes → Correo → "Quitar configuración" → Quitar.
4. **Final read:** `read.mjs '{"smtp": *[_id=="config.smtp"][0]._id, "campaigns": count(*[_type=="campaign" && subject match "ZZ*"]), "zz": count(*[_type=="subscriber" && email match "zz-*"])}'`. Expected: `smtp` null, `campaigns` 0 and `zz` 0. `config.smtpUsage` may stay (a counter only).

- [ ] **Step 5: Stage any fix-ups**

```bash
git status --short
```

If a fix was needed, stage it and report what it fixed; otherwise there is nothing to stage.
