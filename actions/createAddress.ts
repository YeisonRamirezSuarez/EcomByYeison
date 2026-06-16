"use server";

import { currentUser } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { Address } from "@/sanity.types";

export interface NewAddressInput {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  default?: boolean;
}

/**
 * Creates a delivery address owned by the signed-in user.
 *
 * Both the owner (`clerkUserId`) and the email are taken from the Clerk session
 * on the server, never from the client, so an address can only ever be created
 * for the authenticated user.
 */
export async function createAddress(
  input: NewAddressInput
): Promise<Address | null> {
  const user = await currentUser();
  if (!user) return null;

  const name = input.name?.trim();
  const address = input.address?.trim();
  const city = input.city?.trim();
  const state = input.state?.trim() ?? "";
  const zip = input.zip?.trim() ?? "";
  if (!name || !address || !city) return null;

  // Only one default per user: clear the flag on the others first.
  if (input.default) {
    const existing = await backendClient.fetch<{ _id: string }[]>(
      `*[_type == "address" && clerkUserId == $uid && default == true]{_id}`,
      { uid: user.id }
    );
    await Promise.all(
      existing.map((a) =>
        backendClient.patch(a._id).set({ default: false }).commit()
      )
    );
  }

  const created = await backendClient.create({
    _type: "address",
    clerkUserId: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? "",
    name,
    address,
    city,
    state,
    zip,
    default: !!input.default,
    createdAt: new Date().toISOString(),
  });

  return created as unknown as Address;
}
