"use server";

import { createHash } from "node:crypto";
import { validateSubscription } from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";

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
    // The dot in the id keeps subscribers out of Sanity's public read API; same email, same id.
    const id = `subscriber.${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
    await backendClient.createIfNotExists({
      _id: id,
      _type: "subscriber",
      email,
      consent: true,
      subscribedAt: new Date().toISOString(),
      source: "footer",
    });
    return { ok: true, message: SUCCESS };
  } catch (error) {
    console.log("Subscribe failed", error);
    return { ok: false, errors: { form: "No pudimos suscribirte, intenta de nuevo" } };
  }
}
