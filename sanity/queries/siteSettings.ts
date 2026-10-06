import { cache } from "react";
import { headers } from "next/headers";
import { client } from "../lib/client";
import { backendClient } from "../lib/backendClient";
import { DEFAULT_THEME, isThemeKey, type ThemeKey } from "@/constants/themes";
import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from "@/constants/currencies";
import { BRAND_DEFAULTS } from "@/constants/brandDefaults";
import { withDefaults, type Brand } from "@/lib/brand";
import { readHomeSections, type HomeSection } from "@/lib/homeSections";
import { DEFAULT_STYLES, readStyles, type Styles } from "@/lib/styles";
import { getActor } from "@/lib/roles";
import { can } from "@/lib/permissions";

export const SITE_SETTINGS_ID = "siteSettings";
export const SITE_SETTINGS_DRAFT_ID = `drafts.${SITE_SETTINGS_ID}`;
export const SITE_SETTINGS_TAG = "siteSettings";
// Set by proxy.ts when the URL has ?vista-previa=1.
export const PREVIEW_HEADER = "x-preview";

// Image fields come back as { assetId, url }, or null when no asset is set.
const image = (path: string) =>
  `select(defined(${path}.asset) => { "assetId": ${path}.asset._ref, "url": ${path}.asset->url })`;

const SITE_SETTINGS_QUERY = `*[_id == "siteSettings"][0]{
  theme, currency, storeName, tagline, description, logoType, logoText, logoSubtext,
  "logoImage": ${image("logoImage")},
  "favicon": ${image("favicon")},
  banner{ badge, title, highlight, subtitle, description, primaryCta, secondaryCta, stats, "image": ${image("image")} },
  contact, social, pages,
  homeSections[]{
    _key, kind, hidden, title, text, count, button, imageSide, background, source, align,
    "category": category._ref,
    "image": ${image("image")},
    items[]{ _key, name, text, rating, "photo": ${image("photo")} }
  },
  styles
}`;

export type SiteSettings = { theme: ThemeKey; currency: CurrencyCode; homeSections: HomeSection[] | null; styles: Styles } & Brand;

function normalize(data: Record<string, unknown> | null): SiteSettings {
  const theme = data?.theme;
  const currency = data?.currency;
  return {
    ...withDefaults(data, BRAND_DEFAULTS),
    theme: isThemeKey(theme) ? theme : DEFAULT_THEME,
    currency: isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY,
    homeSections: readHomeSections(data?.homeSections),
    styles: readStyles(data?.styles),
  };
}

// The draft is shown only to people who may configure the store: the editor (draft: true)
// or a ?vista-previa=1 request. Everyone else gets the published settings.
async function canSeeDraft(draft: boolean): Promise<boolean> {
  if (!draft) {
    try {
      if ((await headers()).get(PREVIEW_HEADER) !== "1") return false;
    } catch {
      return false; // outside a request (scripts)
    }
  }
  const actor = await getActor();
  return Boolean(actor && can(actor.role, "configurar"));
}

// Once per request per mode. Keyed by a primitive because cache() compares arguments by identity.
const loadSiteSettings = cache(async (draft: boolean): Promise<SiteSettings> => {
  try {
    const data = (await canSeeDraft(draft))
      ? await backendClient.fetch<Record<string, unknown> | null>(
          SITE_SETTINGS_QUERY,
          {},
          { perspective: "drafts", useCdn: false, cache: "no-store" }
        )
      : await client.fetch<Record<string, unknown> | null>(
          SITE_SETTINGS_QUERY,
          {},
          { useCdn: false, next: { revalidate: 3600, tags: [SITE_SETTINGS_TAG] } }
        );
    return normalize(data);
  } catch (error) {
    console.log("Error fetching site settings", error);
    return { ...BRAND_DEFAULTS, theme: DEFAULT_THEME, currency: DEFAULT_CURRENCY, homeSections: null, styles: DEFAULT_STYLES };
  }
});

export const getSiteSettings = ({ draft = false }: { draft?: boolean } = {}) => loadSiteSettings(draft);

export async function hasAppearanceDraft(): Promise<boolean> {
  return backendClient.fetch<boolean>(
    `defined(*[_id == $id][0]._id)`,
    { id: SITE_SETTINGS_DRAFT_ID },
    { perspective: "raw", useCdn: false, cache: "no-store" }
  );
}
