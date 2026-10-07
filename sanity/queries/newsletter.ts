import "server-only";
import { DEFAULT_DAILY_LIMIT, EMPTY_SMTP, PAGE_SIZE, type CampaignContent, type CampaignFailure, type CampaignProgress, type CampaignStatus, type PauseReason, type SmtpSecurity, type SmtpView, type SubscriberFilters, type SubscriberRow, type SubscriberStatus } from "@/lib/newsletter";
import type { Cta, ImageValue } from "@/lib/brand";
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

// Always the same order (by _id), so a campaign resumes exactly after its cursor.
export async function getNextBatch(cursor: string, limit: number): Promise<{ _id: string; email: string }[]> {
  return backendClient.fetch(
    `*[_type == "subscriber" && ${ACTIVE} && _id > $cursor] | order(_id asc) [0...$limit]{ _id, email }`,
    { cursor, limit },
    FRESH
  );
}
