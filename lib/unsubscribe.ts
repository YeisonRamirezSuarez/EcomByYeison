import "server-only";
import type { Locale } from "@/lib/i18n";
import { isSubscriberId } from "@/lib/newsletter";
import { signUnsubscribe, verifyUnsubscribe } from "@/lib/secrets";
import { backendClient } from "@/sanity/lib/backendClient";
import { getSubscriberStatus } from "@/sanity/queries/newsletter";

export const siteUrl = (): string => (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");

// page: the store page with the "Darme de baja" button, in the email's language (l). l is not
// signed: it only picks the page's language. oneClick: the List-Unsubscribe target.
export function unsubscribeLinks(subscriberId: string, secret: string, base = siteUrl(), language?: Locale) {
  const query = `s=${encodeURIComponent(subscriberId)}&t=${signUnsubscribe(subscriberId, secret)}`;
  return {
    page: `${base}/boletin/baja?${query}${language ? `&l=${language}` : ""}`,
    oneClick: `${base}/api/boletin/baja?${query}`,
  };
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

// Same answer whether the subscriber exists or was already out: nothing to learn.
// A failed write must not say "Listo": the person would keep getting emails.
export async function applyUnsubscribe(subscriberId: unknown, signature: unknown): Promise<boolean> {
  if (!isValidUnsubscribe(subscriberId, signature)) return false;
  try {
    // Deleted (null) or already out: no write, so the original unsubscribedAt stays.
    if ((await getSubscriberStatus(subscriberId as string)) === "active") {
      await backendClient
        .patch(subscriberId as string)
        .set({ status: "unsubscribed", unsubscribedAt: new Date().toISOString() })
        .commit();
    }
    return true;
  } catch (error) {
    console.error("Unsubscribe failed", error);
    return false;
  }
}
