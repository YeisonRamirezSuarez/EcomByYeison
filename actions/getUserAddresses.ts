"use server";

import { currentUser } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { Address } from "@/sanity.types";

/**
 * Returns the addresses that belong to the currently signed-in user.
 *
 * The owner is derived from the Clerk session on the server (never from a
 * client-supplied id), and the GROQ filter is parameterized, so a user can only
 * ever read their own addresses — no more leaking the whole `address` dataset
 * to the browser.
 */
export async function getUserAddresses(): Promise<Address[]> {
  const user = await currentUser();
  if (!user) return [];

  const addresses = await backendClient.fetch<Address[]>(
    `*[_type == "address" && clerkUserId == $uid] | order(publishedAt desc)`,
    { uid: user.id }
  );
  return addresses ?? [];
}
