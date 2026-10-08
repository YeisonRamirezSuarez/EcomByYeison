// Pure validation rules shared by the admin panel (browser) and server actions.
// Only type imports: also run by scripts/check-permissions.mjs.
import type {
  BannerSettings,
  ContactSettings,
  ContentBlock,
  IdentitySettings,
  ImageValue,
  LocalizedCta,
  PageContent,
  SocialSettings,
  Stat,
} from "./brand";
import type { Locale } from "./i18n";
import { tr, type AdminText } from "./adminText/index.ts";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

export const PAGE_KEYS = ["about", "terms", "privacy", "faqs", "help"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];
export const PAGE_LABELS = {
  about: "Nosotros",
  terms: "Términos",
  privacy: "Privacidad",
  faqs: "Preguntas frecuentes",
  help: "Ayuda",
} as const satisfies Record<PageKey, AdminText>;

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
} as const satisfies Record<string, AdminText>;
export type ContentIconKey = keyof typeof CONTENT_ICONS;
export const isContentIcon = (value: unknown): value is ContentIconKey =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(CONTENT_ICONS, value);

export const BRAND_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_ERROR: AdminText = "Solo JPG, PNG, WEBP o SVG de hasta 4 MB";
export const INVALID_FORM: AdminText = "Revisa los campos marcados";
export const MAX_BLOCKS = 20;
export const MAX_STATS = 3;

const required = (ui: Locale) => tr(ui, "Campo obligatorio");
// Same text as requiredIn in lib/localize.ts (pure modules cannot import each other).
const requiredIn = (locale: Locale, ui: Locale) => tr(ui, locale === "en" ? "Campo obligatorio (inglés)" : "Campo obligatorio (español)");
const hrefError = (ui: Locale) => tr(ui, "Usa una ruta que empiece por / o un enlace https://");
const tooLong = (max: number, ui: Locale) => tr(ui, "Máximo {max} caracteres", { max });

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
  allowed: readonly string[] = BRAND_IMAGE_TYPES,
  ui: Locale = "es"
): string | null {
  return allowed.includes(file.type) && file.size > 0 && file.size <= MAX_IMAGE_BYTES
    ? null
    : tr(ui, IMAGE_ERROR);
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function text(errors: Errors, key: string, value: unknown, max: number, ui: Locale, mandatory = false) {
  const s = typeof value === "string" ? value.trim() : "";
  if (mandatory && !s) errors[key] = required(ui);
  else if (s.length > max) errors[key] = tooLong(max, ui);
  return s;
}

// A text with an English twin ("title" + "titleEn"). When required, only the store's main
// language must be filled; the error goes on that field.
function texts(
  errors: Errors,
  prefix: string,
  v: Record<string, unknown>,
  name: string,
  max: number,
  ui: Locale,
  need: Locale | null = null
): [string, string] {
  const es = text(errors, `${prefix}${name}`, v[name], max, ui);
  const en = text(errors, `${prefix}${name}En`, v[`${name}En`], max, ui);
  if (need) {
    const field = `${prefix}${need === "en" ? `${name}En` : name}`;
    if (!(need === "en" ? en : es) && !errors[field]) errors[field] = requiredIn(need, ui);
  }
  return [es, en];
}

function link(errors: Errors, key: string, value: unknown, ui: Locale) {
  const s = typeof value === "string" ? value.trim() : "";
  if (s && !isValidHref(s)) errors[key] = hrefError(ui);
  return s;
}

const ASSET_ID = /^image-[a-zA-Z0-9]+-\d+x\d+-[a-z0-9]+$/;

function image(errors: Errors, key: string, value: unknown, ui: Locale): ImageValue | null {
  if (value === null || value === undefined) return null;
  const v = asObject(value);
  if (typeof v.assetId === "string" && ASSET_ID.test(v.assetId) && isHttpsUrl(v.url)) {
    return { assetId: v.assetId, url: v.url as string };
  }
  errors[key] = tr(ui, "Imagen inválida");
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

export function validateIdentity(input: unknown, ui: Locale = "es"): ValidationResult<IdentitySettings> {
  const v = asObject(input);
  const errors: Errors = {};
  const logoType = v.logoType === "text" || v.logoType === "image" ? v.logoType : null;
  if (!logoType) errors.logoType = tr(ui, "Elige texto o imagen");
  const [tagline, taglineEn] = texts(errors, "", v, "tagline", 80, ui);
  const [description, descriptionEn] = texts(errors, "", v, "description", 300, ui);
  const value: IdentitySettings = {
    storeName: text(errors, "storeName", v.storeName, 60, ui, true),
    tagline,
    taglineEn,
    description,
    descriptionEn,
    logoType: logoType ?? "text",
    logoText: text(errors, "logoText", v.logoText, 30, ui, logoType === "text"),
    logoSubtext: text(errors, "logoSubtext", v.logoSubtext, 30, ui),
    logoImage: image(errors, "logoImage", v.logoImage, ui),
    favicon: image(errors, "favicon", v.favicon, ui),
  };
  if (logoType === "image" && !value.logoImage && !errors.logoImage) {
    errors.logoImage = tr(ui, "Sube una imagen para el logo");
  }
  return result(errors, value);
}

function cta(errors: Errors, key: string, input: unknown, ui: Locale): LocalizedCta {
  const v = asObject(input);
  const [label, labelEn] = texts(errors, `${key}.`, v, "label", 30, ui);
  const href = link(errors, `${key}.href`, v.href, ui);
  if ((label || labelEn) && !href && !errors[`${key}.href`]) errors[`${key}.href`] = required(ui);
  return { label, labelEn, href };
}

export function validateBanner(input: unknown, primary: Locale = "es", ui: Locale = "es"): ValidationResult<BannerSettings> {
  const v = asObject(input);
  const errors: Errors = {};
  const rawStats = asArray(v.stats);
  if (rawStats.length > MAX_STATS) errors.stats = tr(ui, "Máximo {max} cifras", { max: MAX_STATS });
  const used = new Set<string>();
  const stats: Stat[] = rawStats.slice(0, MAX_STATS).map((item, i) => {
    const s = asObject(item);
    const [label, labelEn] = texts(errors, `stats.${i}.`, s, "label", 20, ui, primary);
    return { _key: uniqueKey(s._key, i, used), value: text(errors, `stats.${i}.value`, s.value, 10, ui, true), label, labelEn };
  });
  const [badge, badgeEn] = texts(errors, "", v, "badge", 40, ui);
  const [title, titleEn] = texts(errors, "", v, "title", 60, ui);
  const [highlight, highlightEn] = texts(errors, "", v, "highlight", 30, ui);
  const [subtitle, subtitleEn] = texts(errors, "", v, "subtitle", 80, ui);
  const [description, descriptionEn] = texts(errors, "", v, "description", 200, ui);
  return result(errors, {
    badge,
    badgeEn,
    title,
    titleEn,
    highlight,
    highlightEn,
    subtitle,
    subtitleEn,
    description,
    descriptionEn,
    primaryCta: cta(errors, "primaryCta", v.primaryCta, ui),
    secondaryCta: cta(errors, "secondaryCta", v.secondaryCta, ui),
    image: image(errors, "image", v.image, ui),
    stats,
  });
}

export function validateContact(input: unknown, ui: Locale = "es"): ValidationResult<ContactSettings> {
  const v = asObject(input);
  const errors: Errors = {};
  const email = text(errors, "email", v.email, 254, ui);
  if (email && !isEmail(email)) errors.email = tr(ui, "Correo inválido");
  const [address, addressEn] = texts(errors, "", v, "address", 80, ui);
  const [hours, hoursEn] = texts(errors, "", v, "hours", 80, ui);
  return result(errors, { email, phone: text(errors, "phone", v.phone, 80, ui), address, addressEn, hours, hoursEn });
}

export function validateSocial(input: unknown, ui: Locale = "es"): ValidationResult<SocialSettings> {
  const v = asObject(input);
  const errors: Errors = {};
  const value = {} as SocialSettings;
  for (const key of SOCIAL_KEYS) {
    const s = typeof v[key] === "string" ? (v[key] as string).trim() : "";
    if (s && !isHttpsUrl(s)) errors[key] = tr(ui, "Debe ser un enlace https://");
    value[key] = s;
  }
  return result(errors, value);
}

export function validatePage(input: unknown, primary: Locale = "es", ui: Locale = "es"): ValidationResult<PageContent> {
  const v = asObject(input);
  const errors: Errors = {};
  const raw = asArray(v.blocks);
  if (raw.length > MAX_BLOCKS) errors.blocks = tr(ui, "Máximo {max} bloques", { max: MAX_BLOCKS });
  const used = new Set<string>();
  const blocks: ContentBlock[] = raw.slice(0, MAX_BLOCKS).map((item, i) => {
    const b = asObject(item);
    if (!isContentIcon(b.icon)) errors[`blocks.${i}.icon`] = tr(ui, "Ícono inválido");
    const [title, titleEn] = texts(errors, `blocks.${i}.`, b, "title", 120, ui, primary);
    const [body, bodyEn] = texts(errors, `blocks.${i}.`, b, "text", 1000, ui);
    return {
      _key: uniqueKey(b._key, i, used),
      icon: isContentIcon(b.icon) ? b.icon : "help-circle",
      title,
      titleEn,
      text: body,
      textEn: bodyEn,
      href: link(errors, `blocks.${i}.href`, b.href, ui),
    };
  });
  const [intro, introEn] = texts(errors, "", v, "intro", 2000, ui);
  return result(errors, { intro, introEn, blocks });
}

export function validateSubscription(input: unknown): ValidationResult<{ email: string }> {
  const v = asObject(input);
  const errors: Errors = {};
  const email = typeof v.email === "string" ? v.email.trim().toLowerCase() : "";
  if (!isEmail(email)) errors.email = "Ingresa un correo válido";
  if (v.consent !== true) errors.consent = "Debes aceptar para suscribirte";
  return result(errors, { email });
}
