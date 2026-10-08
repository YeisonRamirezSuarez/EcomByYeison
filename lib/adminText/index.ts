// The admin panel's texts. The Spanish text is the key; each area file maps it to English, and tr()
// only accepts texts that exist in a map, so a missing translation fails tsc.
// Pure (no Node or Next imports) so scripts/check-permissions.mjs can run it; that is also why
// these files import each other with the .ts extension (tsconfig allowImportingTsExtensions).
import type { Locale } from "../i18n";
import { appearance } from "./appearance.ts";
import { catalog } from "./catalog.ts";
import { common } from "./common.ts";
import { newsletter } from "./newsletter.ts";
import { orders } from "./orders.ts";
import { settings } from "./settings.ts";
import { shell } from "./shell.ts";
import { users } from "./users.ts";
import { validation } from "./validation.ts";

export const AREAS = { common, shell, catalog, orders, users, appearance, newsletter, settings, validation };
const EN = { ...common, ...shell, ...catalog, ...orders, ...users, ...appearance, ...newsletter, ...settings, ...validation };

export type AdminText = keyof typeof EN;
export type TextVars = Record<string, string | number>;

export const ADMIN_LOCALE_COOKIE = "admin-locale";

// The panel's language: the person's cookie when it is "es" or "en", else the store's main language.
export const pickAdminLocale = (cookie: unknown, primary: Locale): Locale =>
  cookie === "es" || cookie === "en" ? cookie : primary;

// Dates in the panel's language.
export const dateLocale = (ui: Locale) => (ui === "en" ? "en-US" : "es");

// The text in the panel's language, with each {name} replaced by vars.name.
export function tr(ui: Locale, text: AdminText, vars?: TextVars): string {
  const template: string = ui === "en" ? EN[text] : text;
  return vars ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : template;
}
