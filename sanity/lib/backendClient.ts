import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "../env";

export const backendClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Disable CDN to always get fresh data for admin operations
  token: process.env.SANITY_API_TOKEN,
});
