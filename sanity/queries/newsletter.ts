import "server-only";
import { DEFAULT_DAILY_LIMIT, EMPTY_SMTP, type SmtpSecurity, type SmtpView, type SubscriberStatus } from "@/lib/newsletter";
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

// Old documents have no status: they count as active.
export async function getSubscriberStatus(id: string): Promise<SubscriberStatus | null> {
  const doc = await backendClient.fetch<{ status: SubscriberStatus } | null>(
    `*[_id == $id][0]{ "status": coalesce(status, "active") }`,
    { id },
    FRESH
  );
  return doc?.status ?? null;
}
