// Store languages and how texts written in the panel reach the visitor. A text field ("name")
// is Spanish; its twin ("nameEn") is English. An empty text falls back to the other language,
// so the store never shows a blank. Pure: only type imports, so scripts/check-permissions.mjs can run it.
import type { Locale } from "./i18n";
import type { ValidationResult } from "./validation";

export type StoreLanguages = { languages: Locale[]; primary: Locale };
export type LanguageChoice = "es" | "en" | "both";

// No setting saved: both languages, Spanish first (how every store worked before).
export const DEFAULT_LANGUAGES: StoreLanguages = { languages: ["es", "en"], primary: "es" };
export const LANGUAGE_NAMES: Record<Locale, string> = { es: "Español", en: "Inglés" };
export const LANGUAGE_CHOICES: Record<LanguageChoice, string> = {
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

// Same text as the copies in lib/validation.ts, lib/catalog.ts and lib/homeSections.ts
// (pure modules cannot import each other); the check script compares them.
export const requiredIn = (locale: Locale) => `Campo obligatorio (${locale === "en" ? "inglés" : "español"})`;

// True when a validator run for that language reports a required field still empty.
export const lacksLanguage = (result: ValidationResult<unknown>, locale: Locale): boolean =>
  !result.ok && Object.values(result.errors).includes(requiredIn(locale));
