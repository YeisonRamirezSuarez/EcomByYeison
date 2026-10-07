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
