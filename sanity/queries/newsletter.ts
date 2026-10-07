import "server-only";
import { DEFAULT_DAILY_LIMIT, EMPTY_SMTP, PAGE_SIZE, type SmtpSecurity, type SmtpView, type SubscriberFilters, type SubscriberRow, type SubscriberStatus } from "@/lib/newsletter";
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
