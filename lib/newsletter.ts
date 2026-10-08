// Newsletter rules shared by the admin panel (browser) and server actions: SMTP settings,
// subscribers, CSV import/export, campaigns and sending. Pure: only type imports (and ./adminText), so
// scripts/check-permissions.mjs can run it.
import type { Cta, ImageValue } from "./brand";
import type { ValidationResult } from "./validation";
import { tr, type AdminText } from "./adminText/index.ts";
import type { Locale } from "./i18n";

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
export const STATUS_LABELS: Record<SubscriberStatus, AdminText> = { active: "Activo", unsubscribed: "Dado de baja" };
export const SOURCE_LABELS: Record<SubscriberSource, AdminText> = { footer: "Pie de página", manual: "Manual", import: "Importado" };
export type SubscriberRow = { _id: string; email: string; subscribedAt: string | null; source: SubscriberSource; status: SubscriberStatus };
export type SubscriberFilters = { search: string; status: SubscriberStatus | "all"; page: number };

export type CampaignStatus = "draft" | "sending" | "paused" | "sent";
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador",
  sending: "Enviando",
  paused: "En pausa",
  sent: "Enviada",
};
export type PauseReason = "user" | "limit" | "smtp" | "address";
export type CampaignContent = {
  subject: string;
  preheader: string;
  image: ImageValue | null;
  title: string;
  text: string;
  button: Cta;
  products: string[];
  language: Locale | null; // null: the store's main language
};
export const EMPTY_CAMPAIGN: CampaignContent = {
  subject: "",
  preheader: "",
  image: null,
  title: "",
  text: "",
  button: { label: "", href: "" },
  products: [],
  language: null,
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

// Sanity patch that adds a batch's failures at the end of the list instead of rewriting it, so
// two tabs finishing batches at once keep each other's entries. Sanity applies unset before
// insert: the oldest go first, keeping the last MAX_FAILURES.
// ponytail: `known` is the length last read, so a race can leave a few more than MAX_FAILURES.
export function failuresPatch(known: number, added: CampaignFailure[]) {
  const excess = known + added.length - MAX_FAILURES;
  return {
    setIfMissing: { failures: [] },
    ...(excess > 0 && { unset: [`failures[0:${excess}]`] }),
    ...(added.length > 0 && { insert: { after: "failures[-1]", items: added } }),
  };
}
export type SendReadiness = { smtpReady: boolean; smtpUnreadable?: boolean; keyReady: boolean; baseUrl: string; address: string; activeCount: number };

type Errors = Record<string, string>;
const REQUIRED = (ui: Locale) => tr(ui, "Campo obligatorio");
const EMAIL_ERROR = (ui: Locale) => tr(ui, "Ingresa un correo válido");
const HREF_ERROR = (ui: Locale) => tr(ui, "Usa una ruta que empiece por / o un enlace https://");
const tooLong = (max: number, ui: Locale) => tr(ui, "Máximo {max} caracteres", { max });
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
  return typeof value === "string" && value.length <= 254 && /^[^\s@"(),:;<>[\]\\]+@[^\s@"(),:;<>[\]\\]+\.[^\s@"(),:;<>[\]\\]+$/.test(value);
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

function text(errors: Errors, key: string, value: unknown, max: number, required = false, ui: Locale = "es"): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length > max) errors[key] = tooLong(max, ui);
  else if (required && !s) errors[key] = REQUIRED(ui);
  return s;
}

function int(errors: Errors, key: string, value: unknown, min: number, max: number, fallback: number, ui: Locale = "es"): number {
  if (value === undefined || value === null || value === "") return fallback;
  // Plain digits only: Number() would also take "1e3" or "0x10".
  const n = typeof value === "string" ? (/^\d+$/.test(value.trim()) ? Number(value) : NaN) : value;
  if (typeof n === "number" && Number.isInteger(n) && n >= min && n <= max) return n;
  errors[key] = tr(ui, "Elige un número entre {min} y {max}", { min, max });
  return fallback;
}

export function validateSmtpSettings(input: unknown, { hasStoredPassword }: { hasStoredPassword: boolean }, ui: Locale = "es"): ValidationResult<SmtpForm> {
  const v = asObject(input);
  const errors: Errors = {};
  const host = text(errors, "host", v.host, 200, true, ui);
  if (host && /\s/.test(host)) errors.host = tr(ui, "Servidor inválido");
  const port = int(errors, "port", v.port, 1, 65535, 587, ui);
  const security: SmtpSecurity =
    typeof v.security === "string" && Object.hasOwn(SMTP_SECURITY, v.security) ? (v.security as SmtpSecurity) : "starttls";
  const user = text(errors, "user", v.user, 200, false, ui);
  const password = typeof v.password === "string" ? v.password : "";
  if (password.length > 500) errors.password = tooLong(500, ui);
  else if (user && !password && !hasStoredPassword) errors.password = tr(ui, "Escribe la contraseña");
  const fromName = text(errors, "fromName", v.fromName, 80, false, ui);
  const fromEmail = text(errors, "fromEmail", v.fromEmail, 254, true, ui).toLowerCase();
  if (fromEmail && !isEmail(fromEmail)) errors.fromEmail = EMAIL_ERROR(ui);
  const replyTo = text(errors, "replyTo", v.replyTo, 254, false, ui).toLowerCase();
  if (replyTo && !isEmail(replyTo)) errors.replyTo = EMAIL_ERROR(ui);
  const dailyLimit = int(errors, "dailyLimit", v.dailyLimit, 1, 100000, DEFAULT_DAILY_LIMIT, ui);
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
  if (href && !errors["button.href"] && !isValidHref(href)) errors["button.href"] = HREF_ERROR("es");
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
  return result(errors, { subject, preheader, image, title, text: body, button: { label, href }, products, language: v.language === "es" || v.language === "en" ? v.language : null });
}

export const SMTP_UNREADABLE: AdminText = "No se pudo leer la contraseña guardada. Vuelve a escribirla en Ajustes → Correo.";

export function campaignSendProblems(content: CampaignContent, ready: SendReadiness): string[] {
  const problems: string[] = [];
  if (ready.smtpUnreadable) problems.push(SMTP_UNREADABLE);
  else if (!ready.smtpReady) problems.push("Configura el correo de salida en Ajustes → Correo.");
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
export function parseEmailCsv(raw: string, ui: Locale = "es"): CsvResult {
  const text = raw.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const rows = csvRows(text, count(firstLine, ";") > count(firstLine, ",") ? ";" : ",");
  const clean = (value: string | undefined) => (value ?? "").trim().toLowerCase();
  let column = rows.length > 0 ? rows[0].findIndex((cell) => EMAIL_HEADER.test(cell.trim())) : -1;
  let start = column >= 0 ? 1 : 0;
  if (column < 0) {
    const first = rows.findIndex((row) => row.some((cell) => isEmail(clean(cell))));
    if (first < 0) return { ok: false, error: tr(ui, "No encontramos una columna de correos") };
    column = rows[first].findIndex((cell) => isEmail(clean(cell)));
    start = first;
  }
  const data = rows.slice(start);
  if (data.length > MAX_IMPORT_ROWS) return { ok: false, error: tr(ui, "Divide el archivo en partes de {max}", { max: MAX_IMPORT_ROWS }) };
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

export function subscribersCsv(rows: SubscriberRow[], ui: Locale = "es"): string {
  const cell = (value: string) => {
    // A leading = + - @ would run as a formula in Excel.
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",;\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = rows.map((r) =>
    [r.email, r.subscribedAt?.slice(0, 10) ?? "", tr(ui, SOURCE_LABELS[r.source]), tr(ui, STATUS_LABELS[r.status])].map(cell).join(",")
  );
  return "﻿" + [tr(ui, "email,fecha,origen,estado"), ...lines].join("\r\n") + "\r\n";
}

// Last page with rows (0-based); an empty list has one empty page.
export const lastPage = (total: number) => Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

export function readSubscriberFilters(params: Record<string, string | string[] | undefined>): SubscriberFilters {
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const status = one(params.estado);
  // Capped so an absurd ?pagina= (Infinity, 1e308) stays a finite query; SubscribersTab sends it to the last page.
  const page = Math.min(Math.floor(Number(one(params.pagina)) || 1), 1_000_000);
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
export type SmtpErrorInfo = { code?: unknown; responseCode?: unknown; command?: unknown; response?: unknown };
const FATAL_CODES = new Set(["EAUTH", "ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ETLS", "EPROTOCOL"]);
const errorParts = (error: SmtpErrorInfo) => ({
  code: typeof error?.code === "string" ? error.code : "",
  response: typeof error?.responseCode === "number" ? error.responseCode : 0,
  command: typeof error?.command === "string" ? error.command.toUpperCase() : "",
  text: typeof error?.response === "string" ? error.response : "",
});

// true = only this address failed, keep sending. false = the server itself failed (login,
// connection, sender refused, "try later"), so every next message would fail too: pause.
// An answer to RCPT TO that is 4xx counts as per-address only with an enhanced status 4.1.x or
// 4.2.x (address / mailbox, e.g. "452 4.2.2 over quota"); any other 4xx is server-wide: pause.
export function isRecipientError(error: SmtpErrorInfo): boolean {
  const { code, response, command, text } = errorParts(error);
  if (FATAL_CODES.has(code) || command.startsWith("MAIL FROM") || response === 421) return false;
  if (response >= 400 && response < 500) return command.startsWith("RCPT") && /\b4\.[12]\.\d{1,3}\b/.test(text);
  return response >= 500 && response < 600;
}

export function smtpErrorMessage(error: SmtpErrorInfo, ui: Locale = "es"): string {
  const { code, response, command } = errorParts(error);
  if (code === "EAUTH" || response === 535) return tr(ui, "Usuario o contraseña incorrectos. Si usas Gmail, usa una contraseña de aplicación.");
  if (code === "ETIMEDOUT") return tr(ui, "El servidor no respondió a tiempo. Revisa el servidor y el puerto.");
  if (code === "ETLS") return tr(ui, "Falló la conexión segura. Prueba con otra opción de seguridad (STARTTLS o SSL).");
  if (code === "ECONNECTION" || code === "EDNS" || code === "ESOCKET") return tr(ui, "No se pudo conectar al servidor. Revisa el servidor, el puerto y la seguridad.");
  if (command.startsWith("MAIL FROM")) return tr(ui, "El servidor rechazó el remitente. Usa un correo de remitente permitido por ese servidor.");
  if (response >= 400 && response < 500) return tr(ui, "El servidor pidió esperar (puede ser un límite de envío). Intenta más tarde.");
  if (response >= 500) return tr(ui, "El servidor rechazó este correo.");
  return tr(ui, "No se pudo enviar el correo.");
}

export const errorDetail = (error: unknown): string => (error instanceof Error ? error.message : String(error)).slice(0, 300);
