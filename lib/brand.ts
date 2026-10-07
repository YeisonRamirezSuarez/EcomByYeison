// Store identity types. A text the visitor sees has an English twin ending in "En"; the base field
// is Spanish. Only type imports: also run by scripts/check-permissions.mjs.
import type { ContentIconKey, PageKey, SocialKey } from "./validation";

export type ImageValue = { assetId: string; url: string };
export type Cta = { label: string; href: string };
// A button the store shows: its text in both languages.
export type LocalizedCta = Cta & { labelEn: string };
export type Stat = { _key: string; value: string; label: string; labelEn: string };

export type BannerSettings = {
  badge: string;
  badgeEn: string;
  title: string;
  titleEn: string;
  highlight: string;
  highlightEn: string;
  subtitle: string;
  subtitleEn: string;
  description: string;
  descriptionEn: string;
  primaryCta: LocalizedCta;
  secondaryCta: LocalizedCta;
  image: ImageValue | null;
  stats: Stat[];
};

export type ContactSettings = {
  email: string;
  phone: string;
  address: string;
  addressEn: string;
  hours: string;
  hoursEn: string;
};
export type SocialSettings = Record<SocialKey, string>;

export type ContentBlock = {
  _key: string;
  icon: ContentIconKey;
  title: string;
  titleEn: string;
  text: string;
  textEn: string;
  href: string;
};
export type PageContent = { intro: string; introEn: string; blocks: ContentBlock[] };

export type IdentitySettings = {
  storeName: string;
  tagline: string;
  taglineEn: string;
  description: string;
  descriptionEn: string;
  logoType: "text" | "image";
  logoText: string;
  logoSubtext: string;
  logoImage: ImageValue | null;
  favicon: ImageValue | null;
};

export type Brand = IdentitySettings & {
  banner: BannerSettings;
  contact: ContactSettings;
  social: SocialSettings;
  pages: Record<PageKey, PageContent>;
};

export type BrandSection = "identity" | "banner" | "contact" | "social";

// Identity pieces client components need (logo in the mobile menu, social links).
export type ClientBrand = Pick<
  Brand,
  "storeName" | "logoType" | "logoText" | "logoSubtext" | "logoImage" | "social"
>;

export const toClientBrand = ({
  storeName,
  logoType,
  logoText,
  logoSubtext,
  logoImage,
  social,
}: Brand): ClientBrand => ({ storeName, logoType, logoText, logoSubtext, logoImage, social });

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// A field missing in Sanity (undefined or null) takes the default; a stored value wins, even "" or [].
// Objects merge field by field over the default's keys only; a value of the wrong type falls back.
// An English twin ("taglineEn") missing next to a stored Spanish text stays empty, so the store
// shows the owner's own text instead of the default English one.
function merge<T>(raw: unknown, defaults: T): T {
  if (raw === undefined || raw === null) return defaults;
  if (defaults === null) {
    // Image fields: keep only images whose asset still resolves to a URL.
    return (isPlainObject(raw) && typeof raw.url === "string" ? raw : defaults) as T;
  }
  if (Array.isArray(defaults)) return (Array.isArray(raw) ? raw : defaults) as T;
  if (isPlainObject(defaults)) {
    if (!isPlainObject(raw)) return defaults;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(defaults)) {
      const base = key.endsWith("En") ? key.slice(0, -2) : "";
      const ownSpanish = base !== "" && base in defaults && raw[key] == null && raw[base] != null;
      out[key] = ownSpanish ? "" : merge(raw[key], defaults[key]);
    }
    return out as T;
  }
  return (typeof raw === typeof defaults ? raw : defaults) as T;
}

export const withDefaults = (raw: unknown, defaults: Brand): Brand => merge(raw, defaults);

// Fields the appearance editor drafts and publishes. Never currency or pages:
// those are saved directly and must survive publishing an older draft.
export const APPEARANCE_FIELDS = [
  "theme",
  "storeName",
  "tagline",
  "taglineEn",
  "description",
  "descriptionEn",
  "logoType",
  "logoText",
  "logoSubtext",
  "logoImage",
  "favicon",
  "banner",
  "contact",
  "social",
  "homeSections",
  "styles",
] as const;

export function pickAppearance(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of APPEARANCE_FIELDS) if (doc[key] !== undefined) out[key] = doc[key];
  return out;
}

// Patch for the published document: fields missing in the draft (e.g. a removed favicon) are unset.
export function appearancePatch(draft: Record<string, unknown>): {
  set: Record<string, unknown>;
  unset: string[];
} {
  const set = pickAppearance(draft);
  return { set, unset: APPEARANCE_FIELDS.filter((key) => !(key in set)) };
}
