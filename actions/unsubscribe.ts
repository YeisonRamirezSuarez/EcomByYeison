"use server";

import { applyUnsubscribe } from "@/lib/unsubscribe";

// Public: the signed link is the permission.
export async function unsubscribe(subscriberId: string, signature: string): Promise<{ ok: boolean }> {
  return { ok: await applyUnsubscribe(subscriberId, signature) };
}
