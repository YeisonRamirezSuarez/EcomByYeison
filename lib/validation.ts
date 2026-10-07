// Pure validation rules shared by the admin panel (browser) and server actions.
// Only type imports: also run by scripts/check-permissions.mjs.
import type {
  BannerSettings,
  ContactSettings,
  ContentBlock,
  Cta,
  IdentitySettings,
  ImageValue,
  PageContent,
  SocialSettings,
  Stat,
} from "./brand";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

export const PAGE_KEYS = ["about", "terms", "privacy", "faqs", "help"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];
export const PAGE_LABELS: Record<PageKey, string> = {
  about: "Nosotros",
  terms: "Términos",
  privacy: "Privacidad",
  faqs: "Preguntas frecuentes",
  help: "Ayuda",
};

export const SOCIAL_KEYS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "x",
  "whatsapp",
  "pinterest",
] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];
export const SOCIAL_LABELS: Record<SocialKey, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
  whatsapp: "WhatsApp",
  pinterest: "Pinterest",
};

export const CONTENT_ICONS = {
  truck: "Camión",
  "shield-check": "Escudo",
  headset: "Audífonos",
  star: "Estrella",
  "shopping-cart": "Carrito",
  "credit-card": "Tarjeta",
  package: "Paquete",
  "rotate-ccw": "Devolución",
  "clipboard-list": "Lista",
  "help-circle": "Ayuda",
  "file-text": "Documento",
  mail: "Correo",
  "user-check": "Usuario",
  lock: "Candado",
  cookie: "Cookie",
} as const;
export type ContentIconKey = keyof typeof CONTENT_ICONS;
export const isContentIcon = (value: unknown): value is ContentIconKey =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(CONTENT_ICONS, value);

export const BRAND_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_ERROR = "Solo JPG, PNG, WEBP o SVG de hasta 4 MB";
export const INVALID_FORM = "Revisa los campos marcados";
export const MAX_BLOCKS = 20;
export const MAX_STATS = 3;

const REQUIRED = "Campo obligatorio";
const HREF_ERROR = "Usa una ruta que empiece por / o un enlace https://";
const tooLong = (max: number) => `Máximo ${max} caracteres`;

type Errors = Record<string, string>;

export function isHttpsUrl(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 300) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isValidHref(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 300) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  return isHttpsUrl(value);
}

export function isEmail(value: unknown): boolean {
  return (
    typeof value === "string" && value.length <= 254 && /^[^\s@"(),:;<>[\]\\]+@[^\s@"(),:;<>[\]\\]+\.[^\s@"(),:;<>[\]\\]+$/.test(value)
  );
}

export function validateImageFile(
  file: { type: string; size: number },
  allowed: readonly string[] = BRAND_IMAGE_TYPES
): string | null {
  return allowed.includes(file.type) && file.size > 0 && file.size <= MAX_IMAGE_BYTES
    ? null
    : IMAGE_ERROR;
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function text(errors: Errors, key: string, value: unknown, max: number, required = false) {
  const s = typeof value === "string" ? value.trim() : "";
  if (required && !s) errors[key] = REQUIRED;
  else if (s.length > max) errors[key] = tooLong(max);
  return s;
}

function link(errors: Errors, key: string, value: unknown) {
  const s = typeof value === "string" ? value.trim() : "";
  if (s && !isValidHref(s)) errors[key] = HREF_ERROR;
  return s;
}

const ASSET_ID = /^image-[a-zA-Z0-9]+-\d+x\d+-[a-z0-9]+$/;

function image(errors: Errors, key: string, value: unknown): ImageValue | null {
  if (value === null || value === undefined) return null;
  const v = asObject(value);
  if (typeof v.assetId === "string" && ASSET_ID.test(v.assetId) && isHttpsUrl(v.url)) {
    return { assetId: v.assetId, url: v.url as string };
  }
  errors[key] = "Imagen inválida";
  return null;
}

// Sanity array items need unique, simple keys.
function uniqueKey(value: unknown, index: number, used: Set<string>) {
  let key = typeof value === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(value) ? value : `k${index}`;
  for (let n = 0; used.has(key); n++) key = `k${index}x${n}`;
  used.add(key);
  return key;
}

const result = <T>(errors: Errors, value: T): ValidationResult<T> =>
  Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };

export function validateIdentity(input: unknown): ValidationResult<IdentitySettings> {
  const v = asObject(input);
  const errors: Errors = {};
  const logoType = v.logoType === "text" || v.logoType === "image" ? v.logoType : null;
  if (!logoType) errors.logoType = "Elige texto o imagen";
  const value: IdentitySettings = {
    storeName: text(errors, "storeName", v.storeName, 60, true),
    tagline: text(errors, "tagline", v.tagline, 80),
    description: text(errors, "description", v.description, 300),
    logoType: logoType ?? "text",
    logoText: text(errors, "logoText", v.logoText, 30, logoType === "text"),
    logoSubtext: text(errors, "logoSubtext", v.logoSubtext, 30),
    logoImage: image(errors, "logoImage", v.logoImage),
    favicon: image(errors, "favicon", v.favicon),
  };
  if (logoType === "image" && !value.logoImage && !errors.logoImage) {
    errors.logoImage = "Sube una imagen para el logo";
  }
  return result(errors, value);
}

function cta(errors: Errors, key: string, input: unknown): Cta {
  const v = asObject(input);
  const label = text(errors, `${key}.label`, v.label, 30);
  const href = link(errors, `${key}.href`, v.href);
  if (label && !href && !errors[`${key}.href`]) errors[`${key}.href`] = REQUIRED;
  return { label, href };
}

export function validateBanner(input: unknown): ValidationResult<BannerSettings> {
  const v = asObject(input);
  const errors: Errors = {};
  const rawStats = asArray(v.stats);
  if (rawStats.length > MAX_STATS) errors.stats = `Máximo ${MAX_STATS} cifras`;
  const used = new Set<string>();
  const stats: Stat[] = rawStats.slice(0, MAX_STATS).map((item, i) => {
    const s = asObject(item);
    return {
      _key: uniqueKey(s._key, i, used),
      value: text(errors, `stats.${i}.value`, s.value, 10, true),
      label: text(errors, `stats.${i}.label`, s.label, 20, true),
    };
  });
  return result(errors, {
    badge: text(errors, "badge", v.badge, 40),
    title: text(errors, "title", v.title, 60),
    highlight: text(errors, "highlight", v.highlight, 30),
    subtitle: text(errors, "subtitle", v.subtitle, 80),
    description: text(errors, "description", v.description, 200),
    primaryCta: cta(errors, "primaryCta", v.primaryCta),
    secondaryCta: cta(errors, "secondaryCta", v.secondaryCta),
    image: image(errors, "image", v.image),
    stats,
  });
}

export function validateContact(input: unknown): ValidationResult<ContactSettings> {
  const v = asObject(input);
  const errors: Errors = {};
  const email = text(errors, "email", v.email, 254);
  if (email && !isEmail(email)) errors.email = "Correo inválido";
  return result(errors, {
    email,
    phone: text(errors, "phone", v.phone, 80),
    address: text(errors, "address", v.address, 80),
    hours: text(errors, "hours", v.hours, 80),
  });
}

export function validateSocial(input: unknown): ValidationResult<SocialSettings> {
  const v = asObject(input);
  const errors: Errors = {};
  const value = {} as SocialSettings;
  for (const key of SOCIAL_KEYS) {
    const s = typeof v[key] === "string" ? (v[key] as string).trim() : "";
    if (s && !isHttpsUrl(s)) errors[key] = "Debe ser un enlace https://";
    value[key] = s;
  }
  return result(errors, value);
}

export function validatePage(input: unknown): ValidationResult<PageContent> {
  const v = asObject(input);
  const errors: Errors = {};
  const raw = asArray(v.blocks);
  if (raw.length > MAX_BLOCKS) errors.blocks = `Máximo ${MAX_BLOCKS} bloques`;
  const used = new Set<string>();
  const blocks: ContentBlock[] = raw.slice(0, MAX_BLOCKS).map((item, i) => {
    const b = asObject(item);
    if (!isContentIcon(b.icon)) errors[`blocks.${i}.icon`] = "Ícono inválido";
    return {
      _key: uniqueKey(b._key, i, used),
      icon: isContentIcon(b.icon) ? b.icon : "help-circle",
      title: text(errors, `blocks.${i}.title`, b.title, 120, true),
      text: text(errors, `blocks.${i}.text`, b.text, 1000),
      href: link(errors, `blocks.${i}.href`, b.href),
    };
  });
  return result(errors, { intro: text(errors, "intro", v.intro, 2000), blocks });
}

export function validateSubscription(input: unknown): ValidationResult<{ email: string }> {
  const v = asObject(input);
  const errors: Errors = {};
  const email = typeof v.email === "string" ? v.email.trim().toLowerCase() : "";
  if (!isEmail(email)) errors.email = "Ingresa un correo válido";
  if (v.consent !== true) errors.consent = "Debes aceptar para suscribirte";
  return result(errors, { email });
}
