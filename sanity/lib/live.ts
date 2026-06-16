// Querying with "sanityFetch" will keep content automatically updated
// Before using it, import and render "<SanityLive />" in your layout, see
// https://github.com/sanity-io/next-sanity#live-content-api for more information.
import { defineLive } from "next-sanity/live";
import { client } from "./client";

const token = process.env.SANITY_API_READ_TOKEN;
if (!token) {
  throw new Error("SANITY_API_READ_TOKEN is not set");
}

// Only a serverToken is configured: live queries run server-side. We do NOT
// pass a browserToken — that ships the read token to the client (where it could
// read drafts/unpublished content), and <SanityLive /> isn't mounted anyway.
export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: token,
  fetchOptions: {
    revalidate: 60,
  },
});
