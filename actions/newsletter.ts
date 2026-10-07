"use server";

import { subscriberDocId } from "@/lib/secrets";
import { validateSubscription } from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";
import { getSubscriberStatus } from "@/sanity/queries/newsletter";

export type SubscribeResult =
  | { ok: true; message: string }
  | { ok: false; errors: Record<string, string> };

const SUCCESS = "¡Listo! Te suscribiste";

// Public action. Same answer whether the email already existed, so nobody can probe the list.
// ponytail: no rate limit; add one if bots start filling the list.
export async function subscribe(input: unknown): Promise<SubscribeResult> {
  const honeypot = (input as { website?: unknown } | null)?.website;
  if (typeof honeypot === "string" && honeypot) return { ok: true, message: SUCCESS };

  const result = validateSubscription(input);
  if (!result.ok) return { ok: false, errors: result.errors };
  const { email } = result.value;

  try {
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
  } catch (error) {
    console.log("Subscribe failed", error);
    return { ok: false, errors: { form: "No pudimos suscribirte, intenta de nuevo" } };
  }
}
