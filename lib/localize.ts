// Store languages and how texts written in the panel reach the visitor. A text field ("name")
// is Spanish; its twin ("nameEn") is English. An empty text falls back to the other language,
// so the store never shows a blank. Pure: only type imports, so scripts/check-permissions.mjs can run it.
import type { AdminText } from "./adminText/index.ts";
import type { Brand as StoreBrand, PageContent } from "./brand";
import type { HomeSection } from "./homeSections";
import type { Locale } from "./i18n";
import type { Product } from "../sanity.types";
import type { ValidationResult } from "./validation";

export type StoreLanguages = { languages: Locale[]; primary: Locale };
export type LanguageChoice = "es" | "en" | "both";

// No setting saved: both languages, Spanish first (how every store worked before).
export const DEFAULT_LANGUAGES: StoreLanguages = { languages: ["es", "en"], primary: "es" };
export const LANGUAGE_NAMES: Record<Locale, AdminText> = { es: "Español", en: "Inglés" };
export const LANGUAGE_CHOICES: Record<LanguageChoice, AdminText> = {
  es: "Solo español",
  en: "Solo inglés",
  both: "Español e inglés",
};

export const isLocale = (value: unknown): value is Locale => value === "es" || value === "en";

export function readLanguages(raw: unknown): StoreLanguages {
  const v = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = v.languages;
  if (!Array.isArray(list) || list.length === 0 || list.length > 2 || !list.every(isLocale) || new Set(list).size !== list.length) {
    return DEFAULT_LANGUAGES;
  }
  if (list.length === 1) return { languages: [list[0]], primary: list[0] };
  return { languages: ["es", "en"], primary: isLocale(v.defaultLocale) ? v.defaultLocale : "es" };
}

// Ajustes → Idiomas: "es" | "en" | "both" (+ main language) → what is saved in siteSettings.
export function languagesFromChoice(choice: unknown, primary: unknown): StoreLanguages | null {
  if (choice === "es" || choice === "en") return { languages: [choice], primary: choice };
  if (choice === "both" && isLocale(primary)) return { languages: ["es", "en"], primary };
  return null;
}

export const choiceOf = ({ languages }: StoreLanguages): LanguageChoice =>
  languages.length === 2 ? "both" : languages[0];

// The visitor's language: the one they chose (cookie) if the store offers it, else the main one.
export function resolveLocale(wanted: unknown, { languages, primary }: StoreLanguages): Locale {
  return isLocale(wanted) && languages.includes(wanted) ? wanted : primary;
}

const filled = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

export function pickText(es: unknown, en: unknown, locale: Locale): string {
  const [first, second] = locale === "en" ? [en, es] : [es, en];
  return filled(first) ? first : filled(second) ? second : "";
}

// Field edited for a language: "title" (Spanish) or "titleEn" (English).
export const localeKey = (key: string, locale: Locale): string => (locale === "en" ? `${key}En` : key);

// The fields an edit writes: the edited language's field, plus — in a store with one language —
// the other language's twin cleared, so a cleared text never falls back to a hidden default.
export function twinPatch(key: string, text: string, edit: Locale, single: boolean): Record<string, string> {
  const patch = { [localeKey(key, edit)]: text };
  return single ? { ...patch, [localeKey(key, edit === "en" ? "es" : "en")]: "" } : patch;
}

// Error shown under a twin field: its own, else the one on the main-language field (hidden while
// the other language is being edited). `prefix` is the path before the field, e.g. "stats.0.".
export const twinError = (errors: Record<string, string>, prefix: string, key: string, edit: Locale, primary: Locale) =>
  errors[prefix + localeKey(key, edit)] ?? errors[prefix + localeKey(key, primary)];

// Same text as the copies in lib/validation.ts, lib/catalog.ts and lib/homeSections.ts
// (pure modules cannot import each other); the check script compares them.
export const requiredIn = (locale: Locale) => `Campo obligatorio (${locale === "en" ? "inglés" : "español"})`;

// True when a validator run for that language reports a required field still empty.
export const lacksLanguage = (result: ValidationResult<unknown>, locale: Locale): boolean =>
  !result.ok && Object.values(result.errors).includes(requiredIn(locale));

type Titled = { title?: unknown; titleEn?: unknown };
// A referenced document projected as { title, titleEn } (not a bare reference).
const isTitled = (value: unknown): value is Titled =>
  typeof value === "object" && value !== null && !("_ref" in value) && ("title" in value || "titleEn" in value);
const asText = (value: unknown) => (typeof value === "string" ? value : "");

export type LocalizableProduct = {
  name?: unknown;
  nameEn?: unknown;
  nameEs?: unknown;
  description?: unknown;
  descriptionEn?: unknown;
  categories?: unknown;
};

// The product as the store shows it: categories are names, not references. Store components
// and the cart use this type, never the raw Sanity Product.
export type StoreProduct = Omit<Product, "categories"> & { categories?: string[] | null; nameEs?: string };

// The product as the store shows it: name, description and category names in the visitor's
// language. nameEs/nameEn stay so the cart (saved in the browser) can switch later (productName).
export function localizeProduct<T extends LocalizableProduct>(
  product: T,
  locale: Locale
): Omit<T, "categories" | "nameEs"> & Pick<StoreProduct, "categories" | "nameEs"> {
  const nameEs = typeof product.nameEs === "string" ? product.nameEs : asText(product.name);
  const categories = Array.isArray(product.categories)
    ? product.categories.map((c) => (isTitled(c) ? pickText(c.title, c.titleEn, locale) : c))
    : product.categories;
  return {
    ...product,
    name: pickText(nameEs, product.nameEn, locale),
    nameEs,
    nameEn: asText(product.nameEn),
    description: pickText(product.description, product.descriptionEn, locale),
    // Product queries project categories as { title, titleEn }, so they come out as names.
    // Orders keep raw references here, but the orders page never shows categories.
    categories: categories as string[] | null | undefined,
  };
}

export const productName = (product: LocalizableProduct, locale: Locale): string =>
  pickText(typeof product.nameEs === "string" ? product.nameEs : product.name, product.nameEn, locale);

export function localizeTaxonomy<T extends Titled & { description?: unknown; descriptionEn?: unknown }>(doc: T, locale: Locale): T {
  return {
    ...doc,
    title: pickText(doc.title, doc.titleEn, locale),
    description: pickText(doc.description, doc.descriptionEn, locale),
  };
}

const hasBlocks = (value: unknown) => Array.isArray(value) && value.length > 0;

export type LocalizableBlog = Titled & { body?: unknown; bodyEn?: unknown; blogcategories?: unknown };

// Blog posts are written in Studio: the English body replaces the Spanish one only when it has content.
export function localizeBlog<T extends LocalizableBlog>(blog: T, locale: Locale): T {
  const [first, second] = locale === "en" ? [blog.bodyEn, blog.body] : [blog.body, blog.bodyEn];
  const categories = Array.isArray(blog.blogcategories)
    ? blog.blogcategories.map((c) => (isTitled(c) ? { ...c, title: pickText(c.title, c.titleEn, locale) } : c))
    : blog.blogcategories;
  return {
    ...blog,
    title: pickText(blog.title, blog.titleEn, locale),
    body: hasBlocks(first) ? first : hasBlocks(second) ? second : blog.body,
    blogcategories: categories,
  };
}

export function localizeBrand<T extends StoreBrand>(brand: T, locale: Locale): T {
  const pick = (es: unknown, en: unknown) => pickText(es, en, locale);
  const { banner, contact } = brand;
  const page = (p: PageContent): PageContent => ({
    ...p,
    intro: pick(p.intro, p.introEn),
    blocks: p.blocks.map((b) => ({ ...b, title: pick(b.title, b.titleEn), text: pick(b.text, b.textEn) })),
  });
  return {
    ...brand,
    tagline: pick(brand.tagline, brand.taglineEn),
    description: pick(brand.description, brand.descriptionEn),
    banner: {
      ...banner,
      badge: pick(banner.badge, banner.badgeEn),
      title: pick(banner.title, banner.titleEn),
      highlight: pick(banner.highlight, banner.highlightEn),
      subtitle: pick(banner.subtitle, banner.subtitleEn),
      description: pick(banner.description, banner.descriptionEn),
      primaryCta: { ...banner.primaryCta, label: pick(banner.primaryCta.label, banner.primaryCta.labelEn) },
      secondaryCta: { ...banner.secondaryCta, label: pick(banner.secondaryCta.label, banner.secondaryCta.labelEn) },
      stats: banner.stats.map((s) => ({ ...s, label: pick(s.label, s.labelEn) })),
    },
    contact: { ...contact, address: pick(contact.address, contact.addressEn), hours: pick(contact.hours, contact.hoursEn) },
    pages: Object.fromEntries(Object.entries(brand.pages).map(([key, p]) => [key, page(p)])) as StoreBrand["pages"],
  };
}

export function localizeHomeSections(sections: HomeSection[], locale: Locale): HomeSection[] {
  return sections.map((s) => ({
    ...s,
    title: pickText(s.title, s.titleEn, locale),
    text: pickText(s.text, s.textEn, locale),
    button: { ...s.button, label: pickText(s.button.label, s.button.labelEn, locale) },
    items: s.items.map((t) => ({ ...t, text: pickText(t.text, t.textEn, locale) })),
  }));
}

// Settings as the store shows them. Panel editors keep the raw settings (both languages).
export function localizeSettings<T extends StoreBrand & { homeSections: HomeSection[] | null }>(settings: T, locale: Locale): T {
  return {
    ...localizeBrand(settings, locale),
    homeSections: settings.homeSections && localizeHomeSections(settings.homeSections, locale),
  };
}

// Campaign emails: the store address and product names in the campaign's language.
export const localizeEmailBrand = <B extends { address: string; addressEn?: string }>(brand: B, locale: Locale): B => ({
  ...brand,
  address: pickText(brand.address, brand.addressEn, locale),
});

export const localizeEmailProducts = <P extends { name: string; nameEn?: string }>(products: P[], locale: Locale): P[] =>
  products.map((p) => ({ ...p, name: pickText(p.name, p.nameEn, locale) }));
