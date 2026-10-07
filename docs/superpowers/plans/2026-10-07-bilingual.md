# Bilingual Store (Part 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each client store is Spanish-only, English-only or both, chosen in the panel. Everything the owner writes (products, categories, brands, appearance, pages, home sections, campaigns) can be written in both languages, and visitors, order emails and campaigns get the right one.

**Architecture:** One pure module, `lib/localize.ts`, holds the language rules: `readLanguages`, `resolveLocale` and `pickText`. It also holds the "localize" functions that turn a document with twin fields (`name` = Spanish, `nameEn` = English) into the same shape with the base fields in one language. The server resolves the visitor's language once (`getServerLocale`) from the cookie and the store's languages. Store queries localize what they fetch, so store components keep reading `name`/`title`. Panel editors get an "Español | Inglés" selector that switches which twin each text field edits. Validators take the store's main language and require the field only in that language.

**Tech Stack:** Next.js 16.1.6 (App Router, server actions), React 19.2, Sanity 5 (`next-sanity`), Clerk 7, Stripe, nodemailer 8, Zustand, Tailwind v4. Pure modules are tested with `node --experimental-strip-types scripts/check-permissions.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-07-bilingual-design.md`

## Global Constraints

**Scope**
- Admin panel UI stays in Spanish. Store UI texts live in `lib/i18n.ts`; every new key goes in the `Messages` type, in `es` and in `en`.
- Data model: the existing field is Spanish. The new twin `<field>En` is English and is optional in Sanity. There is no migration and no automatic translation.
- Fallback: an empty or whitespace-only text shows the other language (`pickText`). The store never shows a blank because a translation is missing.
- Out of scope: per-language URLs (`/en`), hreflang, browser language detection, more than two languages, translating proper names (store name, logo text, testimonial person name), and an admin panel in English.

**Code rules**
- Pure modules (`lib/localize.ts`, `lib/brand.ts`, `lib/validation.ts`, `lib/homeSections.ts`, `lib/catalog.ts`, `lib/campaignEmail.ts`, `lib/newsletter.ts`, `constants/brandDefaults.ts`) may only `import type` from other project files. The check script runs them in Node.
- No new dependencies. Do not run Sanity typegen: it breaks types today.

**Exact texts (copy them as written)**
- Required-field error for a translated field: `Campo obligatorio (español)` / `Campo obligatorio (inglés)`. Untranslated fields keep `Campo obligatorio`.
- Editor selector buttons: `Español` | `Inglés`. Missing-translation badge: `Falta inglés` / `Falta español`.
- Ajustes → Idiomas options: `Solo español` / `Solo inglés` / `Español e inglés`. Radio group `Idioma principal`. Toast `Idiomas guardados`.
- Campaign: selector label `Idioma de la campaña`. Test subject prefix `[Prueba]` (es) / `[Test]` (en).

**Commands**
- Tests: `npm run -s check:permissions`. Expected last line: `check-permissions: ok`.
- Typecheck: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`. Expected: no output.
- Lint: `npx eslint <files touched>`. Expected: no output.

**Process rules**
- Implementers only stage (`git add`). They never commit, push, stash, reset or checkout. The controller commits with the ticket format: header `bilingual`, a blank line, then `- Se …` lines ending with a period.
- Never name the company reference repository or its client anywhere: specs, plans, code, comments, commits, docs or chat.

**Testing data and environment**
- Browser checks use test data whose name starts with `ZZ`. Clean it up through the panel at the end of the check.
- Never publish Apariencia, never write Sanity with scripts, and never sign in or type passwords or keys.
- Read Sanity only with `node --env-file=.env.local .superpowers/sdd/2026-10-07-bilingual/read.mjs '<GROQ>' '<params JSON>'` (created in Task 2).
- If an action is denied (for example a delete or a publish click), do not work around it. Report it and list the leftovers.
- Before a browser check, note the store's language setting. Restore it at the end of every browser check that changes it.
- The dev server runs on port 3000. If it dies, report it. Do not restart it unless asked.

## Review Focus

1. **Store saved before this change** (Spanish content, no `languages` field). It must look exactly as today: both languages, Spanish first. English visitors see the owner's Spanish texts, never the default English ones. Pinned in Task 4 (`withDefaults` twin rule) and Task 7 (old blocks without `titleEn`).
2. **Cookie or saved browser language the store does not offer.** The visitor always gets the store's language, including client-rendered parts (cart, Clerk). Pinned in Task 1 (`resolveLocale`); browser check in Task 3.
3. **Main language changed while old content exists only in the other language.** Saving requires the new main language. Reading Sanity never drops content. Pinned in Task 5 (`readHomeSections` keeps an English-only testimonial) and Task 6 (`validateProduct(…, "en")`).
4. **Whitespace-only translation.** Counts as empty and falls back. Pinned in Task 1 (`pickText("Hola", "   ", "en")`).
5. **Campaign with no language** (saved before this change), or in a language the store no longer offers. It sends in the store's main language. Pinned in Task 1 (`resolveLocale(null, …)`) and Task 11 (`runBatch` uses `resolveLocale`).

## Rulings Taken While Planning (where the plan narrows or widens the spec)

- **R1:** `newSection` sets both default titles (`title` Spanish and `titleEn` English) instead of only the main language's. It is a superset: every store gets a correct default in both languages.
- **R2:** The `Falta inglés` / `Falta español` badge appears in Producto, Categorías/Marcas and Páginas. Apariencia has no badge (its forms are split across many components); the fallback covers missing texts there.
- **R3:** In Apariencia, the selector starts on the visitor language the server resolved for the admin, so the preview already matches without a reload. Other editors start on the main language.
- **R4:** `lib/email.ts` and `lib/unsubscribe.ts` are `server-only` and cannot run in the check script. Their language changes are checked by type parity (`Record<Locale, …>`) and by code reading in the task report.
- **R5:** Wishlist category names keep the language they had when the product was saved to the wishlist. Product names switch through `productName`.
- **R6:** The cookie is the source of truth. The Zustand `locale` follows the server (`LocaleSync`) instead of writing the cookie.

---

### Task 1: Language rules (`lib/localize.ts`)

**Files:**
- Create: `lib/localize.ts`
- Test: `scripts/check-permissions.mjs` (new block right before the final `console.log("check-permissions: ok");`)

**Interfaces:**
- Consumes: `Locale` from `lib/i18n.ts`, `ValidationResult` from `lib/validation.ts` (types only).
- Produces (later tasks rely on these exact names):
  - `type StoreLanguages = { languages: Locale[]; primary: Locale }`, `type LanguageChoice = "es" | "en" | "both"`.
  - `DEFAULT_LANGUAGES`, `LANGUAGE_NAMES: Record<Locale, string>`, `LANGUAGE_CHOICES: Record<LanguageChoice, string>`, `isLocale(value)`.
  - `readLanguages(raw: unknown): StoreLanguages`.
  - `languagesFromChoice(choice: unknown, primary: unknown): StoreLanguages | null`, `choiceOf(langs): LanguageChoice`.
  - `resolveLocale(wanted: unknown, langs: StoreLanguages): Locale`.
  - `pickText(es: unknown, en: unknown, locale: Locale): string`.
  - `localeKey(key: string, locale: Locale): string`.
  - `requiredIn(locale: Locale): string`, `lacksLanguage(result: ValidationResult<unknown>, locale: Locale): boolean`.

- [ ] **Step 1: Write the failing test**

Add this block to `scripts/check-permissions.mjs` right before `console.log("check-permissions: ok");`:

```js
// Store languages (lib/localize.ts)
{
  const lz = await import("../lib/localize.ts");
  const BOTH_ES = { languages: ["es", "en"], primary: "es" };
  assert.deepEqual(lz.readLanguages(undefined), BOTH_ES);
  assert.deepEqual(lz.readLanguages({}), BOTH_ES);
  assert.deepEqual(lz.readLanguages({ languages: ["en"] }), { languages: ["en"], primary: "en" });
  assert.deepEqual(lz.readLanguages({ languages: ["es"], defaultLocale: "en" }), { languages: ["es"], primary: "es" });
  assert.deepEqual(lz.readLanguages({ languages: ["en", "es"], defaultLocale: "en" }), { languages: ["es", "en"], primary: "en" });
  assert.deepEqual(lz.readLanguages({ languages: ["es", "en"], defaultLocale: "fr" }), BOTH_ES);
  for (const bad of [[], ["fr"], ["es", "es"], ["es", "en", "es"], "es", null]) {
    assert.deepEqual(lz.readLanguages({ languages: bad, defaultLocale: "en" }), BOTH_ES, String(bad));
  }

  // A cookie the store does not offer is ignored
  assert.equal(lz.resolveLocale("en", { languages: ["es"], primary: "es" }), "es");
  assert.equal(lz.resolveLocale("es", { languages: ["en"], primary: "en" }), "en");
  assert.equal(lz.resolveLocale("en", BOTH_ES), "en");
  assert.equal(lz.resolveLocale("fr", { languages: ["es", "en"], primary: "en" }), "en");
  assert.equal(lz.resolveLocale(undefined, { languages: ["es", "en"], primary: "en" }), "en");
  assert.equal(lz.resolveLocale(null, { languages: ["en"], primary: "en" }), "en"); // campaign saved before languages existed
  assert.equal(lz.resolveLocale("", BOTH_ES), "es");

  assert.deepEqual(lz.languagesFromChoice("en", "es"), { languages: ["en"], primary: "en" });
  assert.deepEqual(lz.languagesFromChoice("both", "en"), { languages: ["es", "en"], primary: "en" });
  assert.equal(lz.languagesFromChoice("both", "fr"), null);
  assert.equal(lz.languagesFromChoice("todos", "es"), null);
  assert.equal(lz.choiceOf({ languages: ["es"], primary: "es" }), "es");
  assert.equal(lz.choiceOf(BOTH_ES), "both");

  // Empty or blank translations fall back to the other language
  assert.equal(lz.pickText("Hola", "Hello", "en"), "Hello");
  assert.equal(lz.pickText("Hola", "Hello", "es"), "Hola");
  assert.equal(lz.pickText("Hola", "", "en"), "Hola");
  assert.equal(lz.pickText("Hola", "   ", "en"), "Hola");
  assert.equal(lz.pickText("Hola", undefined, "en"), "Hola");
  assert.equal(lz.pickText("", "Hello", "es"), "Hello");
  assert.equal(lz.pickText(null, "Hello", "es"), "Hello");
  assert.equal(lz.pickText(5, "Hello", "es"), "Hello");
  assert.equal(lz.pickText("", "", "es"), "");
  assert.equal(lz.pickText(undefined, undefined, "en"), "");

  assert.equal(lz.localeKey("title", "es"), "title");
  assert.equal(lz.localeKey("title", "en"), "titleEn");
  assert.equal(lz.requiredIn("es"), "Campo obligatorio (español)");
  assert.equal(lz.requiredIn("en"), "Campo obligatorio (inglés)");
  assert.equal(lz.lacksLanguage({ ok: false, errors: { nameEn: "Campo obligatorio (inglés)" } }, "en"), true);
  assert.equal(lz.lacksLanguage({ ok: false, errors: { price: "Número inválido" } }, "en"), false);
  assert.equal(lz.lacksLanguage({ ok: true, value: {} }, "en"), false);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL with `Cannot find module` … `lib/localize.ts`.

- [ ] **Step 3: Write the module**

Create `lib/localize.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: `check-permissions: ok`.

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"` → no output. Run: `npx eslint lib/localize.ts` → no output.

- [ ] **Step 5: Stage**

```bash
git add lib/localize.ts scripts/check-permissions.mjs
```

---

### Task 2: Language setting (Ajustes → Idiomas)

**Files:**
- Modify: `sanity/queries/siteSettings.ts` (query, `SiteSettings` type, `normalize`, error fallback)
- Modify: `sanity/schemaTypes/siteSettingsType.ts` (two read-only fields after `currency`)
- Modify: `actions/admin.ts` (new `saveLanguages`)
- Create: `components/admin/LanguageSection.tsx`
- Modify: `app/(admin)/admin/ajustes/page.tsx`
- Create (scratch, git-ignored): `.superpowers/sdd/2026-10-07-bilingual/read.mjs`

**Interfaces:**
- Consumes: Task 1 `readLanguages`, `DEFAULT_LANGUAGES`, `languagesFromChoice`, `choiceOf`, `LANGUAGE_CHOICES`, `LANGUAGE_NAMES`, `StoreLanguages`, `LanguageChoice`.
- Produces: `SiteSettings` gains `languages: Locale[]` and `primary: Locale`. Every `getSiteSettings()` caller can read them. `saveLanguages(choice: string, primary: string): Promise<ActionResult<null>>`.

- [ ] **Step 1: Read script for checks**

Create `.superpowers/sdd/2026-10-07-bilingual/read.mjs` (git-ignored scratch, read-only):

```js
// Usage: node --env-file=.env.local .superpowers/sdd/2026-10-07-bilingual/read.mjs '<GROQ>' '<json params>'
const { createClient } = await import("@sanity/client");
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2025-03-20",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});
console.log(JSON.stringify(await client.fetch(process.argv[2], JSON.parse(process.argv[3] ?? "{}")), null, 1));
```

Run: `node --env-file=.env.local .superpowers/sdd/2026-10-07-bilingual/read.mjs '*[_id == "siteSettings"][0]{languages, defaultLocale}'`
Expected: `{"languages": null, "defaultLocale": null}` or the fields absent. Write the output in the report: it is the setting to restore later.

- [ ] **Step 2: Settings read the languages**

In `sanity/queries/siteSettings.ts`:

- Add the import:
  ```ts
  import { DEFAULT_LANGUAGES, readLanguages, type StoreLanguages } from "@/lib/localize";
  ```
- In `SITE_SETTINGS_QUERY`, change the first line from `theme, currency, storeName, …` to:
  ```
  theme, currency, languages, defaultLocale, storeName, tagline, description, logoType, logoText, logoSubtext,
  ```
- Replace the `SiteSettings` type with:
  ```ts
  export type SiteSettings = { theme: ThemeKey; currency: CurrencyCode; homeSections: HomeSection[] | null; styles: Styles } & Brand & StoreLanguages;
  ```
- In `normalize`, add `...readLanguages(data),` right after `...withDefaults(data, BRAND_DEFAULTS),`.
- In the `catch` fallback, change the return to:
  ```ts
  return { ...BRAND_DEFAULTS, ...DEFAULT_LANGUAGES, theme: DEFAULT_THEME, currency: DEFAULT_CURRENCY, homeSections: null, styles: DEFAULT_STYLES };
  ```

- [ ] **Step 3: Studio shows the fields read-only**

In `sanity/schemaTypes/siteSettingsType.ts`, right after the `currency` field, add:

```ts
    defineField({
      name: "languages",
      title: "Idiomas",
      description: "Se cambia en el panel: Ajustes → Idiomas.",
      type: "array",
      of: [{ type: "string" }],
      readOnly: true,
    }),
    defineField({ name: "defaultLocale", title: "Idioma principal", type: "string", readOnly: true }),
```

- [ ] **Step 4: Save action**

In `actions/admin.ts`:

- Add to the imports:
  ```ts
  import { languagesFromChoice } from "@/lib/localize";
  ```
- Change the `siteSettings` import to:
  ```ts
  import { SITE_SETTINGS_DRAFT_ID, SITE_SETTINGS_ID, SITE_SETTINGS_TAG, hasAppearanceDraft } from "@/sanity/queries/siteSettings";
  ```
- Add after `saveCurrency`:

```ts
// Saved like the currency (not through the appearance draft). Also copied onto the draft when
// there is one, so the appearance editor and its preview see the new languages.
export async function saveLanguages(choice: string, primary: string): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    const picked = languagesFromChoice(choice, primary);
    if (!picked) throw new Error("Idiomas inválidos");
    const fields = { languages: picked.languages, defaultLocale: picked.primary };
    const tx = backendClient
      .transaction()
      .createIfNotExists({ _id: SITE_SETTINGS_ID, _type: "siteSettings" })
      .patch(SITE_SETTINGS_ID, { set: fields });
    if (await hasAppearanceDraft()) tx.patch(SITE_SETTINGS_DRAFT_ID, { set: fields });
    await tx.commit();
    updateTag(SITE_SETTINGS_TAG);
    return null;
  });
}
```

- [ ] **Step 5: The Ajustes card**

Create `components/admin/LanguageSection.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { saveLanguages } from "@/actions/admin";
import type { Locale } from "@/lib/i18n";
import { LANGUAGE_CHOICES, LANGUAGE_NAMES, choiceOf, type LanguageChoice, type StoreLanguages } from "@/lib/localize";

const LanguageSection = ({ initial }: { initial: StoreLanguages }) => {
  const router = useRouter();
  const [choice, setChoice] = useState<LanguageChoice>(choiceOf(initial));
  const [primary, setPrimary] = useState<Locale>(initial.primary);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await saveLanguages(choice, primary);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Idiomas guardados");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="font-bold text-gray-900 text-sm">Idiomas</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Con un solo idioma la tienda siempre se muestra en ese idioma y no aparece el botón ES/EN. Los textos que no
          traduzcas se muestran en el otro idioma.
        </p>
      </div>
      <select
        value={choice}
        disabled={pending}
        onChange={(e) => setChoice(e.target.value as LanguageChoice)}
        aria-label="Idiomas de la tienda"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-60"
      >
        {(Object.keys(LANGUAGE_CHOICES) as LanguageChoice[]).map((key) => (
          <option key={key} value={key}>
            {LANGUAGE_CHOICES[key]}
          </option>
        ))}
      </select>
      {choice === "both" && (
        <fieldset>
          <legend className="text-xs font-semibold text-gray-700">Idioma principal</legend>
          <p className="text-xs text-gray-500">El que ve un visitante nuevo y el que se exige al guardar.</p>
          <div className="flex gap-4 mt-1 text-sm">
            {(["es", "en"] as const).map((locale) => (
              <label key={locale} className="flex items-center gap-1.5">
                <input type="radio" name="primaryLocale" checked={primary === locale} onChange={() => setPrimary(locale)} />
                {LANGUAGE_NAMES[locale]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="self-start bg-shop_dark_green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
};

export default LanguageSection;
```

In `app/(admin)/admin/ajustes/page.tsx`:
- Add `import LanguageSection from "@/components/admin/LanguageSection";`.
- Change `const [{ currency }, smtp] = …` to `const [{ currency, languages, primary }, smtp] = …`.
- Right after the currency card (`<div …><CurrencySection … /></div>`), add:

```tsx
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <LanguageSection initial={{ languages, primary }} />
        </div>
```

- [ ] **Step 6: Verify**

- Run: `npm run -s check:permissions 2>&1 | tail -1`. Expected: `check-permissions: ok`.
- Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`. Expected: no output.
- Run: `npx eslint actions/admin.ts components/admin/LanguageSection.tsx "app/(admin)/admin/ajustes" sanity/queries/siteSettings.ts sanity/schemaTypes/siteSettingsType.ts`. Expected: no output.
- Browser (new tab, already signed in as superadmin), open `/admin/ajustes`:
  1. The "Idiomas" card shows "Español e inglés" and the principal Español.
  2. Choose "Solo español" and click Guardar. Expected: toast "Idiomas guardados", and `read.mjs '*[_id == "siteSettings"][0]{languages, defaultLocale}'` shows `["es"]` / `"es"`.
  3. Restore: choose "Español e inglés", principal Español, Guardar. Expected: `read.mjs` shows `["es","en"]` / `"es"`.

- [ ] **Step 7: Stage**

```bash
git add sanity/queries/siteSettings.ts sanity/schemaTypes/siteSettingsType.ts actions/admin.ts components/admin/LanguageSection.tsx "app/(admin)/admin/ajustes/page.tsx"
```

---

### Task 3: Visitor language

**Files:**
- Modify: `lib/locale.ts`
- Modify: `components/Header.tsx`
- Modify: `components/LocaleSync.tsx`, `app/layout.tsx`
- Modify: `components/ClientClerkProvider.tsx`, `app/(client)/layout.tsx`
- Modify: `actions/createCheckoutSession.ts`

**Interfaces:**
- Consumes: Task 1 `resolveLocale`; Task 2 `SiteSettings.languages`/`primary`.
- Produces: `getServerLocale()` (same signature) now honours the store's languages. `normalizeLocale` is removed (no other caller). `LocaleSync` takes `{ locale: Locale }`. `ClientClerkProvider` takes `locale?: Locale` (default `"es"`).

- [ ] **Step 1: Server resolves the language**

Replace `lib/locale.ts` with:

```ts
import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { resolveLocale } from "@/lib/localize";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export { LOCALE_COOKIE };

// The visitor's language: their cookie if the store offers it, else the store's main language.
export async function getServerLocale(): Promise<Locale> {
  const [cookieStore, settings] = await Promise.all([cookies(), getSiteSettings()]);
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, settings);
}
```

Run: `grep -rn "normalizeLocale" --include=*.ts --include=*.tsx app components lib actions`. Expected: no output.

- [ ] **Step 2: No toggle in single-language stores**

In `components/Header.tsx` replace `<LanguageToggle initialLocale={locale} />` with:

```tsx
              {settings.languages.length > 1 && <LanguageToggle initialLocale={locale} />}
```

- [ ] **Step 3: The browser follows the server**

Replace `components/LocaleSync.tsx` with:

```tsx
"use client";

import { useEffect } from "react";
import useStore from "@/store";
import type { Locale } from "@/lib/i18n";

// The server decides the language (cookie + the store's languages). The language saved in the
// browser follows it, so one the store no longer offers never comes back from localStorage.
const LocaleSync = ({ locale }: { locale: Locale }) => {
  const hasHydrated = useStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    document.documentElement.lang = locale;
    const store = useStore.getState();
    if (store.locale !== locale) store.setLocale(locale);
  }, [locale, hasHydrated]);

  return null;
};

export default LocaleSync;
```

In `app/layout.tsx` replace `<LocaleSync />` with `<LocaleSync locale={locale} />`.

- [ ] **Step 4: Clerk follows the server**

Replace the component part of `components/ClientClerkProvider.tsx` (keep the `ClerkProvider` props and comments as they are). The result:

```tsx
"use client";

import { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { enUS } from "@clerk/localizations";
import { clerkEs } from "@/lib/clerkEs";
import type { Locale } from "@/lib/i18n";

// locale: the visitor's language resolved on the server. The admin panel omits it (Spanish).
const ClientClerkProvider = ({
  children,
  nonce,
  locale = "es",
}: {
  children: ReactNode;
  nonce?: string;
  locale?: Locale;
}) => (
  <ClerkProvider
    localization={locale === "en" ? enUS : clerkEs}
    signInUrl="/sign-in"
    signUpUrl="/sign-up"
    nonce={nonce}
    // Clerk 7 renamed appearance.layout to appearance.options.
    // "Secured by Clerk" hidden by the store owner's choice (Clerk removes it officially only on paid plans).
    appearance={{
      options: { unsafe_disableDevelopmentModeWarnings: true },
      elements: { userButtonPopoverFooter: { display: "none" }, footerItem: { display: "none" } },
    }}
  >
    {children}
  </ClerkProvider>
);

export default ClientClerkProvider;
```

In `app/(client)/layout.tsx`:
- Add `import { getServerLocale } from "@/lib/locale";`.
- Add `const locale = await getServerLocale();` after `const { styles } = await getSiteSettings();`.
- Change `<ClientClerkProvider nonce={nonce}>` to `<ClientClerkProvider nonce={nonce} locale={locale}>`.

- [ ] **Step 5: Checkout uses an allowed language**

In `actions/createCheckoutSession.ts`:
- Add `import { resolveLocale } from "@/lib/localize";`.
- Replace `const locale = metadata.locale === "en" ? "en" : "es";` with:
  ```ts
  // Store settings never throw (defaults when Sanity is down). The browser's language counts only if the store offers it.
  const settings = await getSiteSettings();
  const locale = resolveLocale(metadata.locale, settings);
  ```
- Replace `const { currency } = await getSiteSettings();` with `const { currency } = settings;`.
- In `sessionPayload`, replace `locale: metadata.locale === "en" ? "en" : "es",` with `locale,`. In its `metadata`, replace `locale: metadata.locale || "es",` with `locale,`.

- [ ] **Step 6: Verify**

- Run the test, typecheck and lint commands. Lint target: `npx eslint lib/locale.ts components/Header.tsx components/LocaleSync.tsx components/ClientClerkProvider.tsx app/layout.tsx "app/(client)/layout.tsx" actions/createCheckoutSession.ts`. Expected for all three: `check-permissions: ok`, no output, no output.
- Browser (record the setting first, restore it at the end):
  1. Ajustes → "Solo inglés" → Guardar. Open `/` in a new tab.
     - Expected: no ES/EN button in the header.
     - Expected: the top bar reads "Welcome to …".
     - Snippet `document.documentElement.lang` returns `en`.
  2. Run the snippet `document.cookie = "app-locale=es; path=/"` and reload. Expected: still English, because the cookie is ignored.
  3. Ajustes → "Español e inglés" with principal Inglés → Guardar.
     - Run `document.cookie = "app-locale=; max-age=0; path=/"` and reload. Expected: English, and the ES/EN button is visible.
     - Click the ES/EN button. Expected: Spanish.
  4. Restore: "Español e inglés", principal Español → Guardar. Check with `read.mjs`.

- [ ] **Step 7: Stage**

```bash
git add lib/locale.ts components/Header.tsx components/LocaleSync.tsx app/layout.tsx components/ClientClerkProvider.tsx "app/(client)/layout.tsx" actions/createCheckoutSession.ts
```

---

### Task 4: Store identity, banner, contact and pages in two languages

**Files:**
- Modify: `lib/brand.ts` (types, `merge` twin rule, `APPEARANCE_FIELDS`)
- Modify (whole file): `constants/brandDefaults.ts`
- Modify: `lib/validation.ts` (twin helper, validators take the main language)
- Modify: `lib/brandWrites.ts` (`planSection` takes the main language)
- Modify: `actions/appearance.ts`, `actions/brand.ts` (pass the main language)
- Modify: `sanity/queries/siteSettings.ts` (query), `sanity/schemaTypes/siteSettingsType.ts` (Studio fields)
- Modify, keeping types green: `components/admin/appearance/AppearanceEditor.tsx`, `components/admin/brand/BannerSection.tsx`, `components/admin/pages/BlockEditor.tsx`
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: `Locale` type.
- Produces:
  - Types: `LocalizedCta = Cta & { labelEn: string }`; `Stat.labelEn`.
  - `BannerSettings` gains `badgeEn`, `titleEn`, `highlightEn`, `subtitleEn` and `descriptionEn`; its CTAs become `LocalizedCta`.
  - `ContactSettings` gains `addressEn` and `hoursEn`. `ContentBlock` gains `titleEn` and `textEn`. `PageContent` gains `introEn`. `IdentitySettings` gains `taglineEn` and `descriptionEn`.
  - Validators: `validateBanner(input, primary: Locale = "es")` and `validatePage(input, primary: Locale = "es")`. `validateIdentity(input)` and `validateContact(input)` keep one argument and return the new fields.
  - `planSection(section, data, primary: Locale = "es")`.

- [ ] **Step 1: Write the failing tests**

In `scripts/check-permissions.mjs`:

a) Replace the line
```js
assert.equal(v.validatePage({ blocks: [{ ...block(0), title: "" }] }).errors["blocks.0.title"], "Campo obligatorio");
```
with
```js
assert.equal(v.validatePage({ blocks: [{ ...block(0), title: "" }] }).errors["blocks.0.title"], "Campo obligatorio (español)");
```

b) Right after the line `assert.equal(v.validatePage({ intro: "a".repeat(2001) }).errors.intro, "Máximo 2000 caracteres");`, add:

```js
// English twins: required texts only in the store's main language
assert.equal(v.validatePage({ blocks: [{ ...block(0), title: "", titleEn: "Block" }] }).errors["blocks.0.title"], "Campo obligatorio (español)");
const enPage = v.validatePage({ blocks: [{ ...block(0), title: "", titleEn: "Shipping" }] }, "en");
assert.equal(enPage.ok, true);
assert.equal(enPage.value.blocks[0].titleEn, "Shipping");
assert.equal(v.validatePage({ blocks: [block(0)] }, "en").errors["blocks.0.titleEn"], "Campo obligatorio (inglés)");
assert.equal(v.validatePage({ introEn: "a".repeat(2001) }).errors.introEn, "Máximo 2000 caracteres");
assert.equal(v.validateBanner({ ...banner, stats: [{ _key: "a", value: "1", label: "", labelEn: "Sold" }] }, "en").ok, true);
assert.equal(v.validateBanner({ ...banner, stats: [{ _key: "a", value: "1", label: "Vendidos" }] }, "en").errors["stats.0.labelEn"], "Campo obligatorio (inglés)");
assert.equal(v.validateBanner({ ...banner, secondaryCta: { label: "", labelEn: "Deals", href: "" } }).errors["secondaryCta.href"], "Campo obligatorio");
assert.equal(v.validateBanner({ ...banner, titleEn: "Up to" }).value.titleEn, "Up to");
assert.equal(v.validateIdentity({ ...identity, taglineEn: "a".repeat(81) }).errors.taglineEn, "Máximo 80 caracteres");
assert.equal(v.validateContact({ addressEn: " 1 Main St " }).value.addressEn, "1 Main St");
```

c) In the "Brand defaults" part, right after the existing loop `for (const key of v.PAGE_KEYS) { … }`, add:

```js
assert.equal(v.validateBanner(BRAND_DEFAULTS.banner, "en").ok, true);
for (const key of v.PAGE_KEYS) {
  assert.equal(v.validatePage(BRAND_DEFAULTS.pages[key], "en").ok, true, key);
  for (const b of BRAND_DEFAULTS.pages[key].blocks) assert.ok(b.titleEn && b.textEn, `${key}.${b._key}`);
}
assert.ok(BRAND_DEFAULTS.taglineEn && BRAND_DEFAULTS.descriptionEn && BRAND_DEFAULTS.banner.titleEn && BRAND_DEFAULTS.pages.about.introEn);
// A stored Spanish text without its English twin shows the owner's text, not the default English one
const twins = withDefaults(
  { tagline: "Lo mejor", banner: { title: "Hola", primaryCta: { label: "Ver", href: "/shop" } }, contact: { address: "Calle 1" }, pages: { about: { intro: "Somos" } } },
  BRAND_DEFAULTS
);
assert.equal(twins.taglineEn, "");
assert.equal(twins.descriptionEn, BRAND_DEFAULTS.descriptionEn); // description not stored: both defaults
assert.equal(twins.banner.titleEn, "");
assert.equal(twins.banner.badgeEn, BRAND_DEFAULTS.banner.badgeEn);
assert.equal(twins.banner.primaryCta.labelEn, "");
assert.equal(twins.contact.addressEn, "");
assert.equal(twins.pages.about.introEn, "");
assert.equal(withDefaults({ tagline: "Lo mejor", taglineEn: "The best" }, BRAND_DEFAULTS).taglineEn, "The best");
```

d) In the "Appearance publish" part, after `assert.ok(brandMod.APPEARANCE_FIELDS.includes("styles"));`, add:

```js
assert.ok(brandMod.APPEARANCE_FIELDS.includes("taglineEn"));
assert.ok(brandMod.APPEARANCE_FIELDS.includes("descriptionEn"));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL on an `AssertionError` (for example the `"Campo obligatorio (español)"` page assert).

- [ ] **Step 3: Types and the twin rule in `lib/brand.ts`**

- Replace the header comment line with:
  ```ts
  // Store identity types. A text the visitor sees has an English twin ending in "En"; the base field
  // is Spanish. Only type imports: also run by scripts/check-permissions.mjs.
  ```
- Replace the types from `export type Cta` down to `export type IdentitySettings = { … };` (inclusive) with:

```ts
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
```

(The line `export type ImageValue = …` already exists at the top. Keep a single copy.)

- Replace the whole `merge` function and its comment with:

```ts
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
```

- In `APPEARANCE_FIELDS`, add `"taglineEn",` after `"tagline",` and `"descriptionEn",` after `"description",`.

- [ ] **Step 4: Defaults in both languages**

Replace `constants/brandDefaults.ts` with:

```ts
// Neutral identity of a brand-new store, in Spanish and English. No brand, country or currency on purpose.
// Only type imports: also run by scripts/check-permissions.mjs.
import type { Brand, ContentBlock } from "../lib/brand";

const block = (
  _key: string,
  icon: ContentBlock["icon"],
  title: string,
  titleEn: string,
  text: string,
  textEn: string,
  href = ""
): ContentBlock => ({ _key, icon, title, titleEn, text, textEn, href });

export const BRAND_DEFAULTS: Brand = {
  storeName: "Mi tienda",
  tagline: "Tu tienda en línea",
  taglineEn: "Your online store",
  description:
    "Encuentra los mejores productos con envíos seguros y atención personalizada.",
  descriptionEn: "Find the best products with secure shipping and personal service.",
  logoType: "text",
  logoText: "Mi tienda",
  logoSubtext: "",
  logoImage: null,
  favicon: null,
  banner: {
    badge: "Novedades",
    badgeEn: "New arrivals",
    title: "Descubre",
    titleEn: "Discover",
    highlight: "lo nuevo",
    highlightEn: "what's new",
    subtitle: "en nuestra tienda",
    subtitleEn: "in our store",
    description: "Explora nuestro catálogo y encuentra lo que buscas.",
    descriptionEn: "Browse our catalog and find what you're looking for.",
    primaryCta: { label: "Comprar ahora", labelEn: "Shop now", href: "/shop" },
    secondaryCta: { label: "Ver ofertas", labelEn: "See deals", href: "/deal" },
    image: null,
    stats: [],
  },
  contact: { email: "", phone: "", address: "", addressEn: "", hours: "", hoursEn: "" },
  social: {
    facebook: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    linkedin: "",
    x: "",
    whatsapp: "",
    pinterest: "",
  },
  pages: {
    about: {
      intro:
        "Somos una tienda en línea comprometida con ofrecerte productos de calidad, precios justos y una experiencia de compra segura.\n\nNuestro equipo trabaja cada día para que encuentres lo que necesitas y lo recibas sin complicaciones.",
      introEn:
        "We are an online store committed to offering you quality products, fair prices and a safe shopping experience.\n\nOur team works every day so you find what you need and receive it without hassle.",
      blocks: [
        block("envios", "truck", "Envíos", "Shipping", "Enviamos tus pedidos de forma rápida y segura.", "We ship your orders quickly and safely."),
        block("seguro", "shield-check", "Compra segura", "Secure shopping", "Tus datos y pagos están protegidos.", "Your data and payments are protected."),
        block("soporte", "headset", "Atención al cliente", "Customer service", "Estamos aquí para ayudarte.", "We're here to help."),
        block("calidad", "star", "Calidad", "Quality", "Seleccionamos cada producto con cuidado.", "We choose every product with care."),
      ],
    },
    terms: {
      intro: "",
      introEn: "",
      blocks: [
        block("uso", "file-text", "1. Uso del sitio", "1. Use of the site", "Al usar este sitio aceptas estos términos y condiciones.", "By using this site you accept these terms and conditions."),
        block("precios", "file-text", "2. Productos y precios", "2. Products and prices", "Los precios, la disponibilidad y las descripciones pueden cambiar sin previo aviso.", "Prices, availability and descriptions may change without notice."),
        block("pagos", "credit-card", "3. Pagos", "3. Payments", "Los pagos se procesan de forma segura a través de Stripe. No almacenamos datos de tarjetas.", "Payments are processed securely through Stripe. We don't store card details."),
        block("devoluciones", "rotate-ccw", "4. Devoluciones", "4. Returns", "Consulta las condiciones de devolución con nuestro equipo antes de enviar un producto.", "Check the return conditions with our team before sending a product back."),
        block("contacto", "mail", "5. Contacto", "5. Contact", "Si tienes dudas sobre estos términos, escríbenos desde la página de contacto.", "If you have questions about these terms, write to us from the contact page."),
      ],
    },
    privacy: {
      intro: "",
      introEn: "",
      blocks: [
        block("datos", "user-check", "1. Información que recopilamos", "1. Information we collect", "Recopilamos tu nombre, correo y dirección de envío para procesar tus pedidos.", "We collect your name, email and shipping address to process your orders."),
        block("uso", "shield-check", "2. Uso de la información", "2. How we use it", "Usamos tu información solo para procesar pedidos y enviarte confirmaciones. No vendemos tus datos.", "We use your information only to process orders and send you confirmations. We don't sell your data."),
        block("auth", "lock", "3. Autenticación", "3. Sign-in", "El inicio de sesión lo gestiona Clerk, una plataforma segura de autenticación.", "Sign-in is handled by Clerk, a secure authentication platform."),
        block("pagos", "credit-card", "4. Pagos", "4. Payments", "Los pagos los procesa Stripe. No tenemos acceso a tus datos bancarios.", "Payments are processed by Stripe. We have no access to your bank details."),
        block("cookies", "cookie", "5. Cookies", "5. Cookies", "Usamos cookies esenciales para mantener tu sesión y tu carrito.", "We use essential cookies to keep your session and your cart."),
      ],
    },
    faqs: {
      intro: "",
      introEn: "",
      blocks: [
        block("pedido", "shopping-cart", "¿Cómo realizo un pedido?", "How do I place an order?", "Agrega los productos al carrito y sigue el proceso de pago. Necesitas iniciar sesión para completar la compra.", "Add products to your cart and follow the checkout steps. You need to sign in to complete the purchase."),
        block("pago", "credit-card", "¿Qué métodos de pago aceptan?", "Which payment methods do you accept?", "Aceptamos tarjetas de crédito y débito procesadas de forma segura por Stripe.", "We accept credit and debit cards, processed securely by Stripe."),
        block("envio", "package", "¿Cuánto tarda el envío?", "How long does shipping take?", "El tiempo de entrega depende de tu ubicación. Te informamos al confirmar tu pedido.", "Delivery time depends on your location. We'll let you know when we confirm your order."),
        block("estado", "clipboard-list", "¿Cómo veo el estado de mi pedido?", "How do I check my order status?", 'Inicia sesión y entra a "Mis pedidos" para ver el historial y estado de tus compras.', 'Sign in and open "My orders" to see the history and status of your purchases.'),
      ],
    },
    help: {
      intro:
        "¿En qué podemos ayudarte? Explora los temas más comunes o escríbenos desde la página de contacto.",
      introEn: "How can we help you? Browse the most common topics or write to us from the contact page.",
      blocks: [
        block("comprar", "shopping-cart", "Cómo comprar", "How to buy", "Aprende a agregar productos al carrito y finalizar tu pedido.", "Learn how to add products to your cart and complete your order.", "/faqs"),
        block("pagos", "credit-card", "Pagos", "Payments", "Métodos de pago aceptados y seguridad.", "Accepted payment methods and security.", "/faqs"),
        block("envios", "package", "Envíos", "Shipping", "Tiempos de entrega y seguimiento de pedidos.", "Delivery times and order tracking.", "/faqs"),
        block("devoluciones", "rotate-ccw", "Devoluciones", "Returns", "Condiciones de devolución y reembolsos.", "Return conditions and refunds.", "/terms"),
      ],
    },
  },
};
```

- [ ] **Step 5: Validators in `lib/validation.ts`**

- Change the type import at the top to also bring `LocalizedCta`, and add the `Locale` type:
  ```ts
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
  ```
  (`Cta` is no longer used in this file. Remove it from the import if `tsc`/`eslint` report it unused.)
- Right after `const REQUIRED = "Campo obligatorio";`, add:
  ```ts
  // Same text as requiredIn in lib/localize.ts (pure modules cannot import each other).
  const requiredIn = (locale: Locale) => `${REQUIRED} (${locale === "en" ? "inglés" : "español"})`;
  ```
- Right after the `text` function, add:

```ts
// A text with an English twin ("title" + "titleEn"). When required, only the store's main
// language must be filled; the error goes on that field.
function texts(
  errors: Errors,
  prefix: string,
  v: Record<string, unknown>,
  name: string,
  max: number,
  required: Locale | null = null
): [string, string] {
  const es = text(errors, `${prefix}${name}`, v[name], max);
  const en = text(errors, `${prefix}${name}En`, v[`${name}En`], max);
  if (required) {
    const field = `${prefix}${required === "en" ? `${name}En` : name}`;
    if (!(required === "en" ? en : es) && !errors[field]) errors[field] = requiredIn(required);
  }
  return [es, en];
}
```

- In `validateIdentity`, replace the two lines `tagline: …` and `description: …` inside `value` with `tagline, taglineEn, description, descriptionEn,`. Right before `const value: IdentitySettings = {`, add:
  ```ts
  const [tagline, taglineEn] = texts(errors, "", v, "tagline", 80);
  const [description, descriptionEn] = texts(errors, "", v, "description", 300);
  ```
- Replace `cta` with:

```ts
function cta(errors: Errors, key: string, input: unknown): LocalizedCta {
  const v = asObject(input);
  const [label, labelEn] = texts(errors, `${key}.`, v, "label", 30);
  const href = link(errors, `${key}.href`, v.href);
  if ((label || labelEn) && !href && !errors[`${key}.href`]) errors[`${key}.href`] = REQUIRED;
  return { label, labelEn, href };
}
```

- Replace `validateBanner` with:

```ts
export function validateBanner(input: unknown, primary: Locale = "es"): ValidationResult<BannerSettings> {
  const v = asObject(input);
  const errors: Errors = {};
  const rawStats = asArray(v.stats);
  if (rawStats.length > MAX_STATS) errors.stats = `Máximo ${MAX_STATS} cifras`;
  const used = new Set<string>();
  const stats: Stat[] = rawStats.slice(0, MAX_STATS).map((item, i) => {
    const s = asObject(item);
    const [label, labelEn] = texts(errors, `stats.${i}.`, s, "label", 20, primary);
    return { _key: uniqueKey(s._key, i, used), value: text(errors, `stats.${i}.value`, s.value, 10, true), label, labelEn };
  });
  const [badge, badgeEn] = texts(errors, "", v, "badge", 40);
  const [title, titleEn] = texts(errors, "", v, "title", 60);
  const [highlight, highlightEn] = texts(errors, "", v, "highlight", 30);
  const [subtitle, subtitleEn] = texts(errors, "", v, "subtitle", 80);
  const [description, descriptionEn] = texts(errors, "", v, "description", 200);
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
    primaryCta: cta(errors, "primaryCta", v.primaryCta),
    secondaryCta: cta(errors, "secondaryCta", v.secondaryCta),
    image: image(errors, "image", v.image),
    stats,
  });
}
```

- Replace the `return result(errors, { … })` of `validateContact` with:

```ts
  const [address, addressEn] = texts(errors, "", v, "address", 80);
  const [hours, hoursEn] = texts(errors, "", v, "hours", 80);
  return result(errors, { email, phone: text(errors, "phone", v.phone, 80), address, addressEn, hours, hoursEn });
```

- Replace `validatePage` with:

```ts
export function validatePage(input: unknown, primary: Locale = "es"): ValidationResult<PageContent> {
  const v = asObject(input);
  const errors: Errors = {};
  const raw = asArray(v.blocks);
  if (raw.length > MAX_BLOCKS) errors.blocks = `Máximo ${MAX_BLOCKS} bloques`;
  const used = new Set<string>();
  const blocks: ContentBlock[] = raw.slice(0, MAX_BLOCKS).map((item, i) => {
    const b = asObject(item);
    if (!isContentIcon(b.icon)) errors[`blocks.${i}.icon`] = "Ícono inválido";
    const [title, titleEn] = texts(errors, `blocks.${i}.`, b, "title", 120, primary);
    const [body, bodyEn] = texts(errors, `blocks.${i}.`, b, "text", 1000);
    return {
      _key: uniqueKey(b._key, i, used),
      icon: isContentIcon(b.icon) ? b.icon : "help-circle",
      title,
      titleEn,
      text: body,
      textEn: bodyEn,
      href: link(errors, `blocks.${i}.href`, b.href),
    };
  });
  const [intro, introEn] = texts(errors, "", v, "intro", 2000);
  return result(errors, { intro, introEn, blocks });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: `check-permissions: ok`.

- [ ] **Step 7: Writes, actions and Sanity**

`lib/brandWrites.ts`:
- Add `import type { Locale } from "@/lib/i18n";`.
- Change the signature to `export function planSection(section: string, data: unknown, primary: Locale = "es"): Planned {`.
- In `case "banner"`, change `validateBanner(data)` to `validateBanner(data, primary)`.

`actions/appearance.ts`:
- Change the `siteSettings` import to also bring `getSiteSettings`.
- In `saveAppearanceDraft`, in the `else` branch, replace `const planned = planSection(section, data);` with:
  ```ts
  const { primary } = await getSiteSettings();
  const planned = planSection(section, data, primary);
  ```

`actions/brand.ts`:
- Change the `siteSettings` import to `import { SITE_SETTINGS_ID, SITE_SETTINGS_TAG, getSiteSettings } from "@/sanity/queries/siteSettings";`.
- In `savePage`, replace `const r = validatePage(data);` with:
  ```ts
  const { primary } = await getSiteSettings();
  const r = validatePage(data, primary);
  ```

`sanity/queries/siteSettings.ts`, in `SITE_SETTINGS_QUERY`:
- First line: `theme, currency, languages, defaultLocale, storeName, tagline, taglineEn, description, descriptionEn, logoType, logoText, logoSubtext,`.
- Banner line: `banner{ badge, badgeEn, title, titleEn, highlight, highlightEn, subtitle, subtitleEn, description, descriptionEn, primaryCta, secondaryCta, stats, "image": ${image("image")} },`.

`sanity/schemaTypes/siteSettingsType.ts`:
- `cta` helper: `fields: [text("label", "Texto"), text("labelEn", "Texto (inglés)"), text("href", "Enlace")]`.
- In `pageFields`:
  - after `longText("intro", "Introducción"),` add `longText("introEn", "Introducción (inglés)"),`;
  - in the block fields, after `text("title", "Título"),` add `text("titleEn", "Título (inglés)"),`, and after `longText("text", "Texto"),` add `longText("textEn", "Texto (inglés)"),`.
- After `text("tagline", "Eslogan"),` add `text("taglineEn", "Eslogan (inglés)"),`. After `longText("description", "Descripción"),` (identity) add `longText("descriptionEn", "Descripción (inglés)"),`.
- In `banner.fields`:
  - after each of `badge`, `title`, `highlight`, `subtitle` add `text("<name>En", "<Title> (inglés)")`;
  - after `longText("description", "Descripción")` add `longText("descriptionEn", "Descripción (inglés)")`;
  - the stat fields become `[text("value", "Valor"), text("label", "Etiqueta"), text("labelEn", "Etiqueta (inglés)")]`.
- In `contact.fields`, after `text("address", "Dirección"),` add `text("addressEn", "Dirección (inglés)"),`, and after `text("hours", "Horario"),` add `text("hoursEn", "Horario (inglés)"),`.

- [ ] **Step 8: Keep the editors compiling**

- `components/admin/appearance/AppearanceEditor.tsx`:
  - Change the destructuring to `const { storeName, tagline, taglineEn, description, descriptionEn, logoType, logoText, logoSubtext, logoImage, favicon } = initial;`.
  - Pass `initial={{ storeName, tagline, taglineEn, description, descriptionEn, logoType, logoText, logoSubtext, logoImage, favicon }}` to `IdentitySection`.
- `components/admin/brand/BannerSection.tsx`: the new stat becomes `{ _key: crypto.randomUUID(), value: "", label: "", labelEn: "" }`. Change `setCta`'s `field` type from `keyof Cta` to `keyof LocalizedCta`, and import `LocalizedCta` instead of `Cta`.
- `components/admin/pages/BlockEditor.tsx`: the new block becomes `{ _key: crypto.randomUUID(), icon: "help-circle", title: "", titleEn: "", text: "", textEn: "", href: "" }`.

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`. Expected: no output. Any other error caused by the new required fields gets the twin with `""` in that file. List it in the report.

Run: `npx eslint lib/brand.ts constants/brandDefaults.ts lib/validation.ts lib/brandWrites.ts actions/appearance.ts actions/brand.ts sanity/queries/siteSettings.ts sanity/schemaTypes/siteSettingsType.ts components/admin/appearance/AppearanceEditor.tsx components/admin/brand/BannerSection.tsx components/admin/pages/BlockEditor.tsx`. Expected: no output.

- [ ] **Step 9: Stage**

```bash
git add lib/brand.ts constants/brandDefaults.ts lib/validation.ts lib/brandWrites.ts actions/appearance.ts actions/brand.ts sanity/queries/siteSettings.ts sanity/schemaTypes/siteSettingsType.ts components/admin/appearance/AppearanceEditor.tsx components/admin/brand/BannerSection.tsx components/admin/pages/BlockEditor.tsx scripts/check-permissions.mjs
```

---

### Task 5: Home sections in two languages

**Files:**
- Modify: `lib/homeSections.ts`
- Modify: `lib/brandWrites.ts` (`homeSections` case)
- Modify: `sanity/queries/siteSettings.ts` (`homeSections` projection), `sanity/schemaTypes/siteSettingsType.ts`
- Modify: `components/admin/appearance/SectionForm.tsx` (new testimonial), `components/admin/appearance/SectionList.tsx` (label), `components/admin/appearance/AppearanceEditor.tsx` (validator)
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: `LocalizedCta` (Task 4), `Locale`.
- Produces:
  - `HomeSection` gains `titleEn` and `textEn`, and `button: LocalizedCta`; `Testimonial` gains `textEn`.
  - `validateHomeSections(input, primary: Locale = "es")`.
  - `readHomeSections(raw)` accepts a required testimonial text in either language.
  - `newSection` sets both default titles (Ruling R1).

- [ ] **Step 1: Write the failing tests**

In the "Home sections" block of `scripts/check-permissions.mjs`:

a) After `assert.equal(DEF[4].title, "Últimas entradas");`, add:
```js
  assert.equal(DEF[2].titleEn, "Popular categories");
  assert.equal(DEF[3].titleEn, "Shop by brand");
  assert.equal(DEF[4].titleEn, "Latest posts");
```

b) In the `it` fixture, change `button: { label: "Ver", href: "/shop" }` to `button: { label: "Ver", labelEn: "", href: "/shop" }`.

c) In the expected `w.homeSections[0]` object, change it to:
```js
  assert.deepEqual(w.homeSections[0], {
    _key: "it1", _type: "homeSection", kind: "imageText", hidden: false,
    image: { _type: "image", asset: { _type: "reference", _ref: IMG.assetId } },
    title: "Nueva", titleEn: "", text: "Hola", textEn: "", button: { label: "Ver", labelEn: "", href: "/shop" }, imageSide: "right",
  });
```

d) Right before the line `// Deleted category → error on that section's field`, add:

```js
  // English twins: the testimonial text is required in the main language when saving,
  // in either language when reading Sanity (content is never dropped by a language change)
  const tmEn = { ...tm, items: [{ ...tm.items[0], text: "", textEn: "Great" }] };
  assert.equal(withSection(tmEn).errors["sections.5.items.0.text"], "Campo obligatorio (español)");
  assert.ok(hs.validateHomeSections([...DEF, tmEn], "en").ok);
  assert.equal(hs.validateHomeSections([...DEF, tm], "en").errors["sections.5.items.0.textEn"], "Campo obligatorio (inglés)");
  assert.deepEqual(hs.readHomeSections([tmEn]).map((s) => s.items[0].textEn), ["Great"]);
  assert.equal(hs.readHomeSections([{ ...tm, items: [{ ...tm.items[0], text: "" }] }]), null);
  assert.equal(hs.isSectionComplete({ ...hs.newSection("promo", "a"), titleEn: "Sale" }), true);
  assert.equal(hs.isSectionComplete({ ...hs.newSection("richText", "a"), textEn: "Hi" }), true);
  assert.ok(withSection({ ...it, titleEn: "x".repeat(81) }).errors["sections.5.titleEn"]);
  assert.ok(withSection({ ...it, button: { label: "", labelEn: "See", href: "" } }).errors["sections.5.button.href"]);
  assert.equal(hs.homeSectionsWrite([{ ...it, titleEn: "New" }]).homeSections[0].titleEn, "New");
  assert.equal(hs.homeSectionsWrite([tmEn]).homeSections[0].items[0].textEn, "Great");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL on an `AssertionError` (`DEF[2].titleEn`).

- [ ] **Step 3: Implement in `lib/homeSections.ts`**

- Replace the type imports with:
  ```ts
  import type { ImageValue, LocalizedCta } from "./brand";
  import type { Locale } from "./i18n";
  import type { ValidationResult } from "./validation";
  ```
- `Testimonial` becomes `{ _key: string; name: string; text: string; textEn: string; rating: number; photo: ImageValue | null }`.
- In `HomeSection`, replace `title: string;` with `title: string;\n  titleEn: string;`, replace `text: string;` with `text: string;\n  textEn: string;`, and replace `button: Cta;` with `button: LocalizedCta;`.
- Replace `newSection` with:

```ts
// Built-in sections start with their title in both languages.
export function newSection(kind: SectionKind, key: string): HomeSection {
  const base: HomeSection = {
    _key: key,
    kind,
    hidden: false,
    title: "",
    titleEn: "",
    text: "",
    textEn: "",
    count: null,
    image: null,
    button: { label: "", labelEn: "", href: "" },
    imageSide: "left",
    background: "primary",
    source: "featured",
    category: "",
    align: "left",
    items: [],
  };
  switch (kind) {
    case "categories":
      return { ...base, title: "Categorías populares", titleEn: "Popular categories", count: 6 };
    case "brands":
      return { ...base, title: "Compra por marca", titleEn: "Shop by brand" };
    case "blog":
      return { ...base, title: "Últimas entradas", titleEn: "Latest posts" };
    case "products":
      return { ...base, count: 8 };
    default:
      return base;
  }
}
```

- In `isSectionComplete`: `case "promo": return Boolean(s.title || s.titleEn);` and `case "richText": return Boolean(s.text || s.textEn);`.
- After `const REQUIRED = "Campo obligatorio";`, add:

```ts
// Same text as requiredIn in lib/localize.ts (pure modules cannot import each other).
const requiredIn = (locale: Locale) => `${REQUIRED} (${locale === "en" ? "inglés" : "español"})`;
// Which language a required text needs: the main one when saving, "any" when reading Sanity.
type Need = Locale | "any";
```

- After the `str` function, add:

```ts
// A text with an English twin ("title" + "titleEn"), optionally required (see Need).
function pair(errors: Errors, key: string, v: Record<string, unknown>, name: string, max: number, required?: Need): [string, string] {
  const es = str(errors, `${key}.${name}`, v[name], max);
  const en = str(errors, `${key}.${name}En`, v[`${name}En`], max);
  if (required === "any") {
    if (!es && !en && !errors[`${key}.${name}`]) errors[`${key}.${name}`] = REQUIRED;
  } else if (required) {
    const field = `${key}.${required === "en" ? `${name}En` : name}`;
    if (!(required === "en" ? en : es) && !errors[field]) errors[field] = requiredIn(required);
  }
  return [es, en];
}
```

- Replace `button` with:

```ts
function button(errors: Errors, key: string, value: unknown): LocalizedCta {
  const v = asObject(value);
  const label = str(errors, `${key}.label`, v.label, 30);
  const labelEn = str(errors, `${key}.labelEn`, v.labelEn, 30);
  const href = typeof v.href === "string" ? v.href.trim() : "";
  if (href.length > 200) errors[`${key}.href`] = tooLong(200);
  else if (href && !isValidHref(href)) errors[`${key}.href`] = HREF_ERROR;
  else if ((label || labelEn) && !href) errors[`${key}.href`] = REQUIRED;
  return { label, labelEn, href };
}
```

- Replace `testimonials` with:

```ts
function testimonials(errors: Errors, p: string, value: unknown, need: Need): Testimonial[] {
  const raw = asArray(value);
  if (raw.length > MAX_TESTIMONIALS) errors[`${p}.items`] = `Máximo ${MAX_TESTIMONIALS} testimonios`;
  const used = new Set<string>();
  return raw.slice(0, MAX_TESTIMONIALS).map((item, j) => {
    const t = asObject(item);
    const q = `${p}.items.${j}`;
    let key = typeof t._key === "string" && KEY.test(t._key) ? t._key : `t${j}`;
    while (used.has(key)) key = `${key}x`;
    used.add(key);
    const [text, textEn] = pair(errors, q, t, "text", 300, need);
    return {
      _key: key,
      name: str(errors, `${q}.name`, t.name, 60, true),
      text,
      textEn,
      rating: int(errors, `${q}.rating`, t.rating, 1, 5) ?? 5,
      photo: image(errors, `${q}.photo`, t.photo),
    };
  });
}
```

- Replace `parseSection` with:

```ts
function parseSection(errors: Errors, p: string, kind: SectionKind, key: string, v: Record<string, unknown>, need: Need): HomeSection {
  const s = newSection(kind, key);
  s.hidden = v.hidden === true;
  const setTitle = () => ([s.title, s.titleEn] = pair(errors, p, v, "title", 80));
  const setText = (max: number) => ([s.text, s.textEn] = pair(errors, p, v, "text", max));
  switch (kind) {
    case "banner":
      break;
    case "productTabs":
    case "brands":
      setTitle();
      break;
    case "categories":
      setTitle();
      s.count = int(errors, `${p}.count`, v.count, 3, 12) ?? 6;
      break;
    case "blog":
      setTitle();
      s.count = int(errors, `${p}.count`, v.count, 1, 6);
      break;
    case "imageText":
      s.image = image(errors, `${p}.image`, v.image);
      setTitle();
      setText(500);
      s.button = button(errors, `${p}.button`, v.button);
      s.imageSide = option(errors, `${p}.imageSide`, v.imageSide, ["left", "right"] as const, "left");
      break;
    case "promo":
      setTitle();
      setText(300);
      s.button = button(errors, `${p}.button`, v.button);
      s.background = option(errors, `${p}.background`, v.background, Object.keys(PROMO_BACKGROUNDS) as PromoBackground[], "primary");
      s.image = image(errors, `${p}.image`, v.image);
      break;
    case "products": {
      setTitle();
      s.source = option(errors, `${p}.source`, v.source, Object.keys(PRODUCT_SOURCES) as ProductSource[], "featured");
      if (s.source === "category") {
        const id = typeof v.category === "string" ? v.category : "";
        // An empty category is an incomplete section: it is saved and the store skips it.
        if (id && !DOC_ID.test(id)) errors[`${p}.category`] = "Categoría inválida";
        else s.category = id;
      }
      s.count = option(errors, `${p}.count`, v.count, PRODUCT_COUNTS, 8);
      break;
    }
    case "richText":
      setTitle();
      setText(2000);
      s.align = option(errors, `${p}.align`, v.align, ["left", "center"] as const, "left");
      break;
    case "testimonials":
      setTitle();
      s.items = testimonials(errors, p, v.items, need);
      break;
    case "newsletter":
      setTitle();
      setText(300);
      break;
  }
  return s;
}
```

- `parseSections(input, errors)` becomes `parseSections(input: unknown[], errors: Errors, need: Need)`. Pass `need` to `parseSection(errors, p, v.kind, key, v, need)`.
- `validateHomeSections(input: unknown, primary: Locale = "es")` calls `parseSections(input, errors, primary)`.
- `readHomeSections` calls `parseSections([item], errors, "any")`.
- Replace `STORED` with:

```ts
const STORED: Record<SectionKind, (keyof HomeSection)[]> = {
  banner: [],
  productTabs: ["title", "titleEn"],
  brands: ["title", "titleEn"],
  categories: ["title", "titleEn", "count"],
  blog: ["title", "titleEn", "count"],
  imageText: ["image", "title", "titleEn", "text", "textEn", "button", "imageSide"],
  promo: ["title", "titleEn", "text", "textEn", "button", "background", "image"],
  products: ["title", "titleEn", "source", "category", "count"],
  richText: ["title", "titleEn", "text", "textEn", "align"],
  testimonials: ["title", "titleEn", "items"],
  newsletter: ["title", "titleEn", "text", "textEn"],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: `check-permissions: ok`.

- [ ] **Step 5: Wire writes, query, Studio and editors**

- `lib/brandWrites.ts`: in `case "homeSections"`, change `validateHomeSections(data)` to `validateHomeSections(data, primary)`.
- `sanity/queries/siteSettings.ts`, `homeSections[]{…}` projection becomes:
  ```
  homeSections[]{
    _key, kind, hidden, title, titleEn, text, textEn, count, button, imageSide, background, source, align,
    "category": category._ref,
    "image": ${image("image")},
    items[]{ _key, name, text, textEn, rating, "photo": ${image("photo")} }
  },
  ```
- `sanity/schemaTypes/siteSettingsType.ts`, in the `homeSection` fields: after `text("title", "Título"),` add `text("titleEn", "Título (inglés)"),`; after `longText("text", "Texto"),` add `longText("textEn", "Texto (inglés)"),`. In the `testimonial` fields, after `longText("text", "Opinión"),` add `longText("textEn", "Opinión (inglés)"),`.
- `components/admin/appearance/SectionForm.tsx`: the new testimonial becomes `{ _key: crypto.randomUUID(), name: "", text: "", textEn: "", rating: 5, photo: null }`.
- `components/admin/appearance/SectionList.tsx`: change `{section.title && <span …> · {section.title}</span>}` to show `section.title || section.titleEn`:
  ```tsx
  {(section.title || section.titleEn) && <span className="font-normal text-gray-500"> · {section.title || section.titleEn}</span>}
  ```
- `components/admin/appearance/AppearanceEditor.tsx`: change the sections autosave validator to the store's main language:
  ```ts
  const sectionsSave = useAutosave(sections, (input) => validateHomeSections(input, initial.primary), (v) => saveAppearanceDraft("homeSections", v), events);
  ```

- [ ] **Step 6: Verify**

- Run the test, typecheck and lint commands (lint: every file in this task's list). Expected: `check-permissions: ok`, no output, no output.

- [ ] **Step 7: Stage**

```bash
git add lib/homeSections.ts lib/brandWrites.ts sanity/queries/siteSettings.ts sanity/schemaTypes/siteSettingsType.ts components/admin/appearance/SectionForm.tsx components/admin/appearance/SectionList.tsx components/admin/appearance/AppearanceEditor.tsx scripts/check-permissions.mjs
```

---

### Task 6: Catalog (products, categories, brands) in two languages

**Files:**
- Modify: `lib/catalog.ts`
- Modify: `sanity/queries/adminCatalog.ts`
- Modify: `actions/catalog.ts`
- Modify: `sanity/schemaTypes/productType.ts`, `categoryType.ts`, `brandTypes.ts`
- Modify, keeping types green: `components/admin/catalog/TaxonomyManager.tsx` (`EMPTY`)
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: `Locale`.
- Produces:
  - `ProductInput` gains `nameEn` and `descriptionEn`; `CategoryInput` and `BrandInput` gain `titleEn` and `descriptionEn`.
  - `validateProduct(input, primary: Locale = "es")`, `validateCategory(input, primary = "es")`, `validateBrand(input, primary = "es")`.
  - `ProductRow.nameEn: string`; `ProductRow.name` falls back to `nameEn`.
  - `ProductForm` gains `nameEn` and `descriptionEn`; `TaxonomyRow` gains `titleEn` and `descriptionEn`.

- [ ] **Step 1: Write the failing tests**

In `scripts/check-permissions.mjs`, "Catalog rules" part:

a) Replace the `assert.deepEqual(vp.value, {…})` with:
```js
assert.deepEqual(vp.value, {
  name: "Parlante", nameEn: "", slug: "parlante", images: [IMG], description: "", descriptionEn: "", price: 10.5, discount: 0, stock: 3,
  categories: ["cat1", "cat2"], brand: null, status: "hot", variant: "gadget", isFeatured: true,
});
```
b) Replace the `vc.value` assert with `assert.deepEqual(vc.value, { title: "Audio", titleEn: "", slug: "audio", description: "", descriptionEn: "", range: null, featured: true, image: null });`.
c) Replace the `vb.value` assert with `assert.deepEqual(vb.value, { title: "Sony", titleEn: "", slug: "sony", description: "Japón", descriptionEn: "", image: IMG });`.
d) Replace the `rows.find((r) => r.id === "c")` assert with:
```js
assert.deepEqual(rows.find((r) => r.id === "c"), { id: "c", name: "Solo borrador", nameEn: "", price: 0, stock: 0, image: null, state: "borrador", updatedAt: "2026-01-15" });
```
e) After `assert.deepEqual(cat.filterProducts(rows, "activos", "  NUEVO ").map((r) => r.id), ["a"]);`, add:

```js
// English twins: the store's main language is the required one
assert.equal(cat.validateProduct({ ...goodProduct, name: "" }).errors.name, "Campo obligatorio (español)");
const enOnly = cat.validateProduct({ ...goodProduct, name: "", nameEn: "Speaker" }, "en");
assert.equal(enOnly.ok, true);
assert.equal(enOnly.value.nameEn, "Speaker");
assert.equal(cat.validateProduct(goodProduct, "en").errors.nameEn, "Campo obligatorio (inglés)");
assert.equal(cat.validateProduct({ ...goodProduct, nameEn: "x".repeat(121) }).errors.nameEn, "Máximo 120 caracteres");
assert.equal(cat.validateProduct({ ...goodProduct, descriptionEn: "x".repeat(2001) }).errors.descriptionEn, "Máximo 2000 caracteres");
assert.equal(cat.validateCategory({ title: "", titleEn: "Audio", slug: "audio" }, "en").ok, true);
assert.equal(cat.validateBrand({ title: "Sony", slug: "sony" }, "en").errors.titleEn, "Campo obligatorio (inglés)");
assert.equal(cat.productWrite({ ...vp.value, nameEn: "Speaker" }).set.nameEn, "Speaker");
assert.equal(cat.categoryWrite({ ...vc.value, titleEn: "Audio" }).set.titleEn, "Audio");
assert.equal(cat.brandWrite({ ...vb.value, descriptionEn: "Japan" }).set.descriptionEn, "Japan");
assert.equal(cat.mergeProductRows([{ _id: "e", name: "", nameEn: "Speaker", _updatedAt: "2026-01-01" }])[0].name, "Speaker");
const both = cat.mergeProductRows([{ _id: "f", name: "Parlante", nameEn: "Speaker", _updatedAt: "2026-01-01" }]);
assert.deepEqual(cat.filterProducts(both, "activos", "speak").map((r) => r.id), ["f"]);
assert.deepEqual(cat.filterProducts(both, "activos", "parla").map((r) => r.id), ["f"]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL (`vp.value` deepEqual).

- [ ] **Step 3: Implement in `lib/catalog.ts`**

- Add `import type { Locale } from "./i18n";`.
- After `const REQUIRED = "Campo obligatorio";`, add:
  ```ts
  // Same text as requiredIn in lib/localize.ts (pure modules cannot import each other).
  const requiredIn = (locale: Locale) => `${REQUIRED} (${locale === "en" ? "inglés" : "español"})`;
  ```
- After the `text` function, add:

```ts
// A text with an English twin ("name" + "nameEn"): when required, only the store's main language must be filled.
function texts(errors: Errors, v: Record<string, unknown>, name: string, max: number, required: Locale | null = null): [string, string] {
  const es = text(errors, name, v[name], max);
  const en = text(errors, `${name}En`, v[`${name}En`], max);
  const field = required === "en" ? `${name}En` : name;
  if (required && !(required === "en" ? en : es) && !errors[field]) errors[field] = requiredIn(required);
  return [es, en];
}
```

- `ProductInput`: add `nameEn: string;` after `name` and `descriptionEn: string;` after `description`.
- `validateProduct(input: unknown, primary: Locale = "es")`. Before `return result(…)`, add:
  ```ts
  const [name, nameEn] = texts(errors, v, "name", 120, primary);
  const [description, descriptionEn] = texts(errors, v, "description", 2000);
  ```
  In the returned object, replace `name: text(…),` with `name, nameEn,` and `description: text(…),` with `description, descriptionEn,`.
- `CategoryInput` and `BrandInput`: add `titleEn: string;` and `descriptionEn: string;`.
- `validateCategory(input: unknown, primary: Locale = "es")` and `validateBrand(input: unknown, primary: Locale = "es")`. In each, before the `return`, add:
  ```ts
  const [title, titleEn] = texts(errors, v, "title", 80, primary);
  const [description, descriptionEn] = texts(errors, v, "description", 500);
  ```
  In each returned object, replace `title: text(…)` with `title, titleEn` and `description: text(…)` with `description, descriptionEn`.
- `productWrite`: add `nameEn: p.nameEn,` after `name` and `descriptionEn: p.descriptionEn,` after `description`. `categoryWrite`/`brandWrite`: add `titleEn: c.titleEn,` / `titleEn: b.titleEn,` and `descriptionEn: c.descriptionEn,` / `descriptionEn: b.descriptionEn,`.
- `ProductDocRow`: add `nameEn?: string;`. `ProductRow`: add `nameEn: string;` after `name`.
- In `mergeProductRows`, replace `name: shown.name ?? "",` with:
  ```ts
      // The panel lists the Spanish name, or the English one when there is no Spanish name.
      name: shown.name || shown.nameEn || "",
      nameEn: shown.nameEn ?? "",
  ```
- In `filterProducts`, change the last line to:
  ```ts
  return inFilter && (!q || row.name.toLowerCase().includes(q) || row.nameEn.toLowerCase().includes(q));
  ```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: `check-permissions: ok`.

- [ ] **Step 5: Panel reads, actions and Studio**

`sanity/queries/adminCatalog.ts`:
- `ProductForm`: add `nameEn: string;` after `name` and `descriptionEn: string;` after `description`. `EMPTY_PRODUCT`: add `nameEn: "",` and `descriptionEn: "",`.
- `FORM_PROJECTION` first line: `name, nameEn, "slug": slug.current, description, descriptionEn, price, discount, stock, status, variant, isFeatured, archived,`.
- `FormDoc`: add `nameEn?: string;` and `descriptionEn?: string;`. `toForm`: add `nameEn: doc.nameEn ?? "",` and `descriptionEn: doc.descriptionEn ?? "",`.
- `getAdminProducts` projection: `{ _id, name, nameEn, price, stock, archived, _updatedAt, "image": images[0].asset->url }`.
- `getCatalogOptions`: both `"title": coalesce(title, "Sin título")` become:
  ```
  "title": select(length(title) > 0 => title, length(titleEn) > 0 => titleEn, "Sin título")
  ```
- `TaxonomyRow`: add `titleEn: string;` after `title` and `descriptionEn: string;` after `description`. In `getTaxonomy`'s `rows` projection, after `"title": coalesce(title, ""),` add `"titleEn": coalesce(titleEn, ""),`, and after `"description": coalesce(description, ""),` add `"descriptionEn": coalesce(descriptionEn, ""),`.

`actions/catalog.ts`:
- Add `import { getSiteSettings } from "@/sanity/queries/siteSettings";`.
- `saveProductDraft`: replace `const r = validateProduct(data);` with:
  ```ts
  const { primary } = await getSiteSettings();
  const r = validateProduct(data, primary);
  ```
- `publishProduct`: in the `form` projection, change the first line to `name, nameEn, "slug": slug.current, description, descriptionEn, price, discount, stock, status, variant, isFeatured,`. Replace `const r = validateProduct(form);` with `const r = validateProduct(form, (await getSiteSettings()).primary);`.
- `saveTaxonomy`: replace the first line with:
  ```ts
  const { primary } = await getSiteSettings();
  const r = kind === "category" ? validateCategory(data, primary) : validateBrand(data, primary);
  ```

`sanity/schemaTypes/productType.ts`:
- `name` field validation becomes:
  ```ts
      // The panel requires the store's main language; here either language is enough.
      validation: (Rule) =>
        Rule.custom((name, context) => (name || context.document?.nameEn ? true : "Write the name in Spanish or English")),
  ```
- After `name`, add `defineField({ name: "nameEn", title: "Product Name (English)", type: "string" }),`.
- In `slug.options`, change `source: "name",` to `source: (doc) => String(doc.name || doc.nameEn || ""),`.
- After `description`, add `defineField({ name: "descriptionEn", title: "Description (English)", type: "string" }),`.

`sanity/schemaTypes/categoryType.ts`:
- `title` validation: `Rule.custom((title, context) => (title || context.document?.titleEn ? true : "Write the title in Spanish or English"))`.
- Add `defineField({ name: "titleEn", title: "Title (English)", type: "string" }),` after `title`.
- `slug.options.source` becomes `(doc) => String(doc.title || doc.titleEn || "")`.
- Add `defineField({ name: "descriptionEn", title: "Description (English)", type: "text" }),` after `description`.

`sanity/schemaTypes/brandTypes.ts`: add `titleEn` (string) after `title` and `descriptionEn` (text) after `description`, same titles as category. `slug.options.source` becomes `(doc) => String(doc.title || doc.titleEn || "")`.

`components/admin/catalog/TaxonomyManager.tsx`: `EMPTY` becomes `{ _id: "", title: "", titleEn: "", slug: "", description: "", descriptionEn: "", range: "", featured: false, image: null, uses: 0 }`.

- [ ] **Step 6: Verify**

- Run the test, typecheck and lint commands (lint: every file in this task's list). Expected: `check-permissions: ok`, no output, no output. If `tsc` rejects `context.document?.nameEn` (it is `unknown`), write `Boolean(name) || Boolean(context.document?.nameEn)`.

- [ ] **Step 7: Stage**

```bash
git add lib/catalog.ts sanity/queries/adminCatalog.ts actions/catalog.ts sanity/schemaTypes/productType.ts sanity/schemaTypes/categoryType.ts sanity/schemaTypes/brandTypes.ts components/admin/catalog/TaxonomyManager.tsx scripts/check-permissions.mjs
```

---

### Task 7: Content in the visitor's language (localize functions)

**Files:**
- Modify: `lib/localize.ts` (append)
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: types `Brand` and `PageContent` (Task 4), `HomeSection` (Task 5).
- Produces:
  - `localizeProduct<T>(product: T, locale): T`. It keeps `nameEs` and `nameEn`, and turns `categories` objects `{title, titleEn}` into strings.
  - `productName(product, locale): string`.
  - `localizeTaxonomy<T>(doc, locale): T` and `localizeBlog<T>(blog, locale): T`.
  - `localizeBrand<T extends Brand>(brand, locale): T` and `localizeHomeSections(sections: HomeSection[], locale): HomeSection[]`.
  - `localizeSettings<T extends Brand & { homeSections: HomeSection[] | null }>(settings, locale): T`.
  - `localizeEmailBrand<B extends { address: string; addressEn?: string }>(brand, locale): B` and `localizeEmailProducts<P extends { name: string; nameEn?: string }>(products, locale): P[]`.

- [ ] **Step 1: Write the failing test**

Add before `console.log("check-permissions: ok");`:

```js
// Content in the visitor's language (lib/localize.ts)
{
  const lz = await import("../lib/localize.ts");
  const hs = await import("../lib/homeSections.ts");
  const { BRAND_DEFAULTS } = await import("../constants/brandDefaults.ts");

  const product = {
    _id: "p", name: "Parlante", nameEn: "Speaker", description: "Suena bien", descriptionEn: "",
    categories: [{ title: "Audio", titleEn: "Sound" }, { title: "Ofertas" }, "Ya texto", null],
  };
  const en = lz.localizeProduct(product, "en");
  assert.equal(en.name, "Speaker");
  assert.equal(en.description, "Suena bien"); // no English description: the Spanish one
  assert.deepEqual(en.categories, ["Sound", "Ofertas", "Ya texto", null]);
  assert.equal(en.nameEs, "Parlante");
  assert.equal(lz.productName(en, "es"), "Parlante"); // the cart can switch back
  assert.equal(lz.localizeProduct(en, "es").name, "Parlante");
  assert.equal(lz.localizeProduct({ name: "Solo español" }, "en").name, "Solo español");
  assert.equal(lz.localizeProduct({ name: "", nameEn: "Only English" }, "es").name, "Only English");
  assert.deepEqual(lz.localizeProduct({ name: "x", categories: [{ _ref: "cat1" }] }, "en").categories, [{ _ref: "cat1" }]);
  assert.equal(lz.productName({ name: "Mesa" }, "en"), "Mesa"); // cart saved before this change

  assert.deepEqual(
    lz.localizeTaxonomy({ title: "Audio", titleEn: "Sound", description: "", descriptionEn: "Speakers" }, "es"),
    { title: "Audio", titleEn: "Sound", description: "Speakers", descriptionEn: "Speakers" }
  );

  const body = [{ _type: "block", children: [] }];
  const bodyEn = [{ _type: "block", children: [], _key: "en" }];
  assert.equal(lz.localizeBlog({ title: "Hola", titleEn: "Hi", body, bodyEn }, "en").body, bodyEn);
  assert.equal(lz.localizeBlog({ title: "Hola", body, bodyEn: [] }, "en").body, body);
  assert.equal(lz.localizeBlog({ title: "Hola", titleEn: "Hi", body }, "en").title, "Hi");
  assert.deepEqual(
    lz.localizeBlog({ title: "x", blogcategories: [{ title: "Noticias", titleEn: "News" }] }, "en").blogcategories,
    [{ title: "News", titleEn: "News" }]
  );

  const brandEn = lz.localizeBrand(
    { ...BRAND_DEFAULTS, tagline: "Lo mejor", taglineEn: "", banner: { ...BRAND_DEFAULTS.banner, stats: [{ _key: "a", value: "1", label: "Vendidos", labelEn: "Sold" }] } },
    "en"
  );
  assert.equal(brandEn.tagline, "Lo mejor");
  assert.equal(brandEn.banner.title, BRAND_DEFAULTS.banner.titleEn);
  assert.equal(brandEn.banner.primaryCta.label, "Shop now");
  assert.equal(brandEn.banner.stats[0].label, "Sold");
  assert.equal(brandEn.pages.about.blocks[0].title, "Shipping");
  assert.equal(brandEn.pages.faqs.intro, ""); // both empty stays empty
  assert.equal(lz.localizeBrand(BRAND_DEFAULTS, "es").pages.about.blocks[0].title, "Envíos");
  // Blocks saved before the twins existed (no titleEn at all) show the Spanish text
  const oldBlock = { _key: "b", icon: "truck", title: "Envíos", text: "Rápido", href: "" };
  const oldPages = { ...BRAND_DEFAULTS.pages, about: { intro: "Hola", blocks: [oldBlock] } };
  assert.equal(lz.localizeBrand({ ...BRAND_DEFAULTS, pages: oldPages }, "en").pages.about.blocks[0].title, "Envíos");
  assert.equal(lz.localizeBrand({ ...BRAND_DEFAULTS, pages: oldPages }, "en").pages.about.intro, "Hola");

  const sections = lz.localizeHomeSections(
    [
      { ...hs.newSection("testimonials", "t"), title: "Opiniones", items: [{ _key: "a", name: "Ana", text: "Excelente", textEn: "Great", rating: 5, photo: null }] },
      hs.newSection("categories", "c"),
      { ...hs.newSection("promo", "p"), title: "Oferta", button: { label: "Ver", labelEn: "See", href: "/deal" } },
    ],
    "en"
  );
  assert.equal(sections[0].title, "Opiniones");
  assert.equal(sections[0].items[0].text, "Great");
  assert.equal(sections[0].items[0].name, "Ana");
  assert.equal(sections[1].title, "Popular categories");
  assert.equal(sections[2].button.label, "See");

  const settings = lz.localizeSettings({ ...BRAND_DEFAULTS, homeSections: null }, "en");
  assert.equal(settings.homeSections, null);
  assert.equal(settings.tagline, BRAND_DEFAULTS.taglineEn);

  assert.equal(lz.localizeEmailBrand({ storeName: "T", address: "Calle 1", addressEn: "1 Main St" }, "en").address, "1 Main St");
  assert.equal(lz.localizeEmailBrand({ storeName: "T", address: "Calle 1" }, "en").address, "Calle 1");
  assert.deepEqual(lz.localizeEmailProducts([{ name: "Parlante", nameEn: "Speaker" }, { name: "Mesa" }], "en").map((p) => p.name), ["Speaker", "Mesa"]);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL with `lz.localizeProduct is not a function`.

- [ ] **Step 3: Implement**

In `lib/localize.ts`, extend the type imports:

```ts
import type { Brand as StoreBrand, PageContent } from "./brand";
import type { HomeSection } from "./homeSections";
```

Append at the end of the file:

```ts
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

// The product as the store shows it: name, description and category names in the visitor's
// language. nameEs/nameEn stay so the cart (saved in the browser) can switch later (productName).
export function localizeProduct<T extends LocalizableProduct>(product: T, locale: Locale): T {
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
    categories,
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
```

If `tsc` reports that a returned object "is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype", end that `return { … }` with `as T`. Do this only for the functions it names.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: `check-permissions: ok`.

Run the typecheck command, then `npx eslint lib/localize.ts`. Expected: no output.

- [ ] **Step 5: Stage**

```bash
git add lib/localize.ts scripts/check-permissions.mjs
```

---

### Task 8: The store shows content in the visitor's language

**Files:**
- Modify: `lib/locale.ts` (add `getLocalizedSettings`)
- Modify:
  - `app/(client)/page.tsx`
  - `app/(client)/about/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `faqs/page.tsx`, `help/page.tsx`, `contact/page.tsx`
  - `components/HomeBanner.tsx`, `components/Footer.tsx`
- Modify: `sanity/queries/index.ts`, `sanity/queries/query.ts`
- Modify: `components/ProductGrid.tsx`, `components/CategoryProducts.tsx`
- Modify: `app/(client)/cart/page.tsx`, `components/WishListProducts.tsx`
- Modify: `actions/createCheckoutSession.ts`, `lib/checkout.ts`
- Modify: `lib/i18n.ts` (keys `checkoutUnknownProduct`, `productsLoading`)
- Modify: `sanity/schemaTypes/blogType.ts`, `sanity/schemaTypes/blogCategoryType.ts`

**Interfaces:**
- Consumes:
  - Task 3 `getServerLocale`.
  - Task 7 `localizeSettings`, `localizeHomeSections`, `localizeProduct`, `productName`, `localizeTaxonomy`, `localizeBlog`.
  - Task 1 `pickText`.
- Produces:
  - `getLocalizedSettings(): Promise<SiteSettings & { locale: Locale }>`.
  - Every exported function in `sanity/queries/index.ts` returns content in the visitor's language. Their signatures do not change.

- [ ] **Step 1: Localized settings**

Append to `lib/locale.ts`:

```ts
// Settings as the visitor sees them: every text in their language (lib/localize.ts).
export async function getLocalizedSettings() {
  const [settings, locale] = await Promise.all([getSiteSettings(), getServerLocale()]);
  return { ...localizeSettings(settings, locale), locale };
}
```

Change its `localize` import to `import { localizeSettings, resolveLocale } from "@/lib/localize";`.

- [ ] **Step 2: Pages and settings consumers**

In each of `app/(client)/about/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `faqs/page.tsx` and `help/page.tsx`:
- Replace the two lines
  ```ts
  const locale = await getServerLocale();
  const { pages } = await getSiteSettings();
  ```
  with
  ```ts
  const { pages, locale } = await getLocalizedSettings();
  ```
- Remove `import { getSiteSettings } from "@/sanity/queries/siteSettings";`. Change `import { getServerLocale } from "@/lib/locale";` to `import { getLocalizedSettings } from "@/lib/locale";`.

`app/(client)/contact/page.tsx`: replace the same two lines (`const locale …` and `const { contact, storeName } = await getSiteSettings();`) with `const { contact, storeName, locale } = await getLocalizedSettings();`, and fix the imports the same way.

`components/Footer.tsx`:
- Replace `const locale = await getServerLocale();` and `const { storeName, description, contact } = await getSiteSettings();` with `const { storeName, description, contact, locale } = await getLocalizedSettings();`.
- Import `getLocalizedSettings` from `@/lib/locale` instead of `getServerLocale`, and drop the `getSiteSettings` import if nothing else uses it.

`components/HomeBanner.tsx`: replace `const { banner } = await getSiteSettings();` with `const { banner } = await getLocalizedSettings();`, and import it from `@/lib/locale`.

`app/(client)/page.tsx`:
- Imports: `import { localizeHomeSections } from "@/lib/localize";` and `import { getLocalizedSettings } from "@/lib/locale";`. Drop the `getSiteSettings` import.
- Body:
  ```ts
  const { homeSections, locale } = await getLocalizedSettings();
  const sections = (homeSections ?? localizeHomeSections(DEFAULT_HOME_SECTIONS, locale)).filter((s) => !s.hidden && isSectionComplete(s));
  ```

- [ ] **Step 3: Store queries localize what they fetch**

`sanity/queries/query.ts`:
- In `DEAL_PRODUCTS` and `SHOP_PRODUCTS_QUERY`, change `"categories": categories[]->title` to `"categories": categories[]->{ title, titleEn }`.
- `BRAND_QUERY` projection becomes `{ "brandName": brand->title, "brandNameEn": brand->titleEn }`.
- In `LATEST_BLOG_QUERY` and `GET_ALL_BLOG`, change `blogcategories[]->{ title }` to `blogcategories[]->{ title, titleEn }`.
- In `SINGLE_BLOG_QUERY`, change `blogcategories[]->{ title, "slug": slug.current, }` to `blogcategories[]->{ title, titleEn, "slug": slug.current, }`.

`sanity/queries/index.ts`:
- Add imports:
  ```ts
  import { getServerLocale } from "@/lib/locale";
  import { localizeBlog, localizeProduct, localizeTaxonomy, pickText } from "@/lib/localize";
  ```
- Below the imports, add:
  ```ts
  // Every query below returns content in the visitor's language (lib/localize.ts): components
  // keep reading name/title. Category names come as { title, titleEn } and become strings.
  const PRODUCT_CATEGORIES = `"categories": categories[]->{ title, titleEn }`;
  ```
- In every exported function, add `const locale = await getServerLocale();` as the first line, before `try`. Then make these returns:
  - `getCategories`: chain the final map: `.map((category) => localizeTaxonomy({ ...category, productCount: counts[category._id] ?? 0 }, locale))`. This replaces the current object-building map.
  - `getAllBrands`: `return (data ?? []).map((brand: { title?: unknown }) => localizeTaxonomy(brand, locale));`.
  - `getLatestBlogs`, `getAllBlogs`, `getOthersBlog`: `return (data ?? []).map((blog) => localizeBlog(blog, locale));`.
  - `getSingleBlog`: `return data ? localizeBlog(data, locale) : null;`.
  - `getBlogCategories`: `return (data ?? []).map((blog) => ({ ...blog, blogcategories: blog.blogcategories?.map((c) => (c ? localizeTaxonomy(c, locale) : c)) }));`.
  - `getDealProducts`, `getShopProducts`: `return (data ?? []).map((product) => localizeProduct(product, locale));`.
  - `getProductBySlug`: `return product?.data ? localizeProduct(product.data, locale) : null;`.
  - `getBrand`: `return (product?.data ?? []).map((row) => ({ ...row, brandName: pickText(row.brandName, row.brandNameEn, locale) }));` (keeps an empty array instead of `null`; `ProductCharacteristics` reads `brand[0]?.brandName`).
  - `getMyOrders`:
    ```ts
    const orders = await backendClient.fetch(MY_ORDERS_QUERY, { userId });
    return orders
      ? orders.map((order) => ({
          ...order,
          products: order.products?.map((item) => (item.product ? { ...item, product: localizeProduct(item.product, locale) } : item)),
        }))
      : null;
    ```
  - `searchProducts`: query filter becomes `archived != true && (name match $q || nameEn match $q)`, projection `{ ..., ${PRODUCT_CATEGORIES} }`, and the return maps `localizeProduct`.
  - `getProductsByVariant` and `getSectionProducts`: projection `{ ..., ${PRODUCT_CATEGORIES} }`, and the return maps `localizeProduct`. `getSectionProducts` keeps its `as Product[]` cast: `return ((data ?? []) as Product[]).map((product) => localizeProduct(product, locale));`.
  - `getMyOrderCount` returns only a number: no `locale` line.

If `tsc` complains about an inferred element type in one of these maps, annotate the parameter with the type that function already uses (`Product`, or the `…Result` type the page already imports). Do not change other logic.

- [ ] **Step 4: Products fetched in the browser**

`components/ProductGrid.tsx`:
- Add `import { localizeProduct } from "@/lib/localize";` and `import { t } from "@/lib/i18n";`.
- In `query`, change `"categories": categories[]->title` to `"categories": categories[]->{ title, titleEn }`.
- Render `<ProductCard key={product?._id} product={localizeProduct(product, locale)} />` (re-picks the name when the visitor switches language).
- Replace `{locale === "en" ? "Products are loading..." : "Cargando productos..."}` with `{t(locale, "productsLoading")}`.

`components/CategoryProducts.tsx`:
- Add `import useStore from "@/store";`, `import { localizeProduct } from "@/lib/localize";` and `import { t } from "@/lib/i18n";`. Add `const { locale } = useStore();` at the top of the component.
- In the query, change `"categories": categories[]->title` to `"categories": categories[]->{ title, titleEn }`.
- Render `<ProductCard product={localizeProduct(product, locale)} />`.
- Replace `<span>Product is loading...</span>` with `<span>{t(locale, "productsLoading")}</span>`.

- [ ] **Step 5: Cart, wishlist and checkout**

- `app/(client)/cart/page.tsx`: import `productName` from `@/lib/localize`. Replace `{product?.name}` (in the item `<h2>`) with `{productName(product, locale)}`.
- `components/WishListProducts.tsx`: import `productName`. Replace `<p className="line-clamp-1">{product?.name}</p>` with `<p className="line-clamp-1">{productName(product, locale)}</p>`.
- `lib/checkout.ts`: in `CheckoutProduct` add `nameEn?: string | null;` and `descriptionEn?: string | null;`.
- `actions/createCheckoutSession.ts`:
  - Fetch projection: `{ _id, name, nameEn, price, description, descriptionEn, images }`.
  - Import `pickText` (extend the `@/lib/localize` import).
  - In `product_data`:
    ```ts
            name: pickText(product.name, product.nameEn, locale) || t(locale, "checkoutUnknownProduct"),
            description: pickText(product.description, product.descriptionEn, locale) || undefined,
    ```
- `lib/i18n.ts`: add `checkoutUnknownProduct: string;` and `productsLoading: string;` to `Messages`.
  - `es`: `checkoutUnknownProduct: "Producto desconocido",` and `productsLoading: "Cargando productos...",`.
  - `en`: `checkoutUnknownProduct: "Unknown Product",` and `productsLoading: "Products are loading...",`.

- [ ] **Step 6: Studio blog fields**

- `sanity/schemaTypes/blogType.ts`: after the `title` field add `defineField({ name: "titleEn", title: "Title (English)", type: "string" }),`. After the `body` field add `defineField({ name: "bodyEn", title: "Body (English)", type: "blockContent" }),`.
- `sanity/schemaTypes/blogCategoryType.ts`: after `title` add `defineField({ name: "titleEn", title: "Title (English)", type: "string" }),`.

- [ ] **Step 7: Verify**

- Run the test, typecheck and lint commands (lint: every file in this task's list). Expected: `check-permissions: ok`, no output, no output.
- `grep -rn "categories\[\]->title" --include=*.ts --include=*.tsx app components sanity lib`. Expected: no output.
- Browser smoke test (no data changes): open `/`, `/shop`, `/deal`, `/blog` and a product page, in ES and in EN (header button).
  - Expected: every page renders.
  - `read_console_messages` with pattern `Error` shows nothing new.
  - The cart page shows item names.

- [ ] **Step 8: Stage**

```bash
git add lib/locale.ts "app/(client)/page.tsx" "app/(client)/about/page.tsx" "app/(client)/terms/page.tsx" "app/(client)/privacy/page.tsx" "app/(client)/faqs/page.tsx" "app/(client)/help/page.tsx" "app/(client)/contact/page.tsx" components/HomeBanner.tsx components/Footer.tsx sanity/queries/index.ts sanity/queries/query.ts components/ProductGrid.tsx components/CategoryProducts.tsx "app/(client)/cart/page.tsx" components/WishListProducts.tsx actions/createCheckoutSession.ts lib/checkout.ts lib/i18n.ts sanity/schemaTypes/blogType.ts sanity/schemaTypes/blogCategoryType.ts
```

---

### Task 9: Panel editors with the "Español | Inglés" selector

**Files:**
- Create: `components/admin/EditorLocale.tsx`
- Modify: `components/admin/brand/fields.tsx` (`TextField` tolerates `undefined`; `twin` helper)
- Modify: `components/admin/products/ProductEditor.tsx`, `app/(admin)/admin/productos/[id]/page.tsx`
- Modify: `components/admin/catalog/TaxonomyManager.tsx`, `app/(admin)/admin/categorias/page.tsx`, `app/(admin)/admin/marcas/page.tsx`
- Modify:
  - `components/admin/appearance/AppearanceEditor.tsx`, `app/(admin)/admin/apariencia/page.tsx`
  - `components/admin/brand/IdentitySection.tsx`, `BannerSection.tsx`, `ContactSection.tsx`
  - `components/admin/appearance/SectionForm.tsx`
- Modify: `components/admin/pages/PagesTab.tsx`, `components/admin/pages/BlockEditor.tsx`, `app/(admin)/admin/paginas/page.tsx`

**Interfaces:**
- Consumes:
  - Task 1 `localeKey`, `lacksLanguage`, `LANGUAGE_NAMES`, `StoreLanguages`, `pickText`.
  - Validators with `primary` (Tasks 4–6).
  - `SiteSettings.languages`/`primary` (Task 2).
- Produces: `EditorLocale({ value, onChange, missing?, label? })`; `twin(value, key, locale, onChange, errors)`.

- [ ] **Step 1: Selector and field helper**

Create `components/admin/EditorLocale.tsx`:

```tsx
"use client";

import type { Locale } from "@/lib/i18n";
import { LANGUAGE_NAMES } from "@/lib/localize";

// Language being edited, in stores with both languages. Images, prices and links are shared,
// so only text fields change with it. missing: languages with a required text still empty.
const EditorLocale = ({
  value,
  onChange,
  missing = [],
  label = "Idioma que editas",
}: {
  value: Locale;
  onChange: (locale: Locale) => void;
  missing?: Locale[];
  label?: string;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="flex rounded-full bg-gray-100 p-0.5" role="group" aria-label={label}>
      {(["es", "en"] as const).map((locale) => (
        <button
          key={locale}
          type="button"
          aria-pressed={value === locale}
          onClick={() => onChange(locale)}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${value === locale ? "bg-white shadow-sm text-shop_dark_green" : "text-gray-600"}`}
        >
          {LANGUAGE_NAMES[locale]}
        </button>
      ))}
    </div>
    {missing.map((locale) => (
      <span key={locale} className="text-xs font-semibold rounded-full bg-amber-100 text-amber-800 px-2.5 py-1">
        Falta {LANGUAGE_NAMES[locale].toLowerCase()}
      </span>
    ))}
  </div>
);

export default EditorLocale;
```

In `components/admin/brand/fields.tsx`:
- Add imports `import type { Locale } from "@/lib/i18n";` and `import { localeKey } from "@/lib/localize";`.
- In `TextField`, change the prop type `value: string;` to `value: string | undefined;`, and both `value={value}` to `value={value ?? ""}`. Twins saved before this change can be missing.
- Add after `TextField`:

```tsx
// TextField props bound to the language being edited: "title" or "titleEn".
export function twin(
  value: object,
  key: string,
  locale: Locale,
  onChange: (field: string, text: string) => void,
  errors: Record<string, string>
) {
  const field = localeKey(key, locale);
  return {
    value: String((value as Record<string, unknown>)[field] ?? ""),
    onChange: (text: string) => onChange(field, text),
    error: errors[field],
  };
}
```

- [ ] **Step 2: Product editor**

`app/(admin)/admin/productos/[id]/page.tsx`:
- Import `getSiteSettings`.
- `const [product, options, { languages, primary }] = await Promise.all([isNew ? null : getAdminProduct(id), getCatalogOptions(), getSiteSettings()]);`.
- Pass `languages={{ languages, primary }}` to `ProductEditor`.

`components/admin/products/ProductEditor.tsx`:
- Imports: `import EditorLocale from "../EditorLocale";`, `import type { Locale } from "@/lib/i18n";`, `import { lacksLanguage, localeKey, pickText, type StoreLanguages } from "@/lib/localize";`.
- Add the prop `languages: StoreLanguages` to the props type and destructuring.
- After the `useState` lines, add:
  ```ts
  const { primary } = languages;
  const other: Locale = primary === "es" ? "en" : "es";
  const [edit, setEdit] = useState<Locale>(primary);
  const nameKey = localeKey("name", edit) as "name" | "nameEn";
  const descriptionKey = localeKey("description", edit) as "description" | "descriptionEn";
  ```
- Autosave validator: `useAutosave(form, (input) => validateProduct(input, primary), save, { … })`.
- Add, after `const errors = …`:
  ```ts
  const missing = languages.languages.length > 1 && lacksLanguage(validateProduct(form, other), other) ? [other] : [];
  ```
- `PageHeader title={pickText(form.name, form.nameEn, primary) || "Nuevo producto"}`.
- As the first child of the left card (before "Nombre"), add:
  ```tsx
  {languages.languages.length > 1 && <EditorLocale value={edit} onChange={setEdit} missing={missing} />}
  ```
- Replace the Nombre and Descripción fields with:
  ```tsx
  <TextField label="Nombre" value={form[nameKey]} max={120} error={errors[nameKey]}
    onChange={(text) => update((slugTouched || edit !== primary ? { [nameKey]: text } : { [nameKey]: text, slug: slugify(text) }) as Partial<ProductForm>)} />
  ```
  and
  ```tsx
  <TextField label="Descripción" value={form[descriptionKey]} max={2000} multiline error={errors[descriptionKey]}
    onChange={(text) => update({ [descriptionKey]: text } as Partial<ProductForm>)} />
  ```
  (The slug follows the name in the main language only.)

- [ ] **Step 3: Categories and brands**

`app/(admin)/admin/categorias/page.tsx` and `app/(admin)/admin/marcas/page.tsx`:
- `const [rows, { languages, primary }] = await Promise.all([getTaxonomy("<kind>"), getSiteSettings()]);`, with `"category"` or `"brand"`.
- Pass `languages={{ languages, primary }}` to `TaxonomyManager`.

`components/admin/catalog/TaxonomyManager.tsx`:
- Imports: `EditorLocale`, `type Locale`, `lacksLanguage`, `localeKey`, `type StoreLanguages`.
- Props: `({ kind, rows, languages }: { kind: TaxonomyKind; rows: TaxonomyRow[]; languages: StoreLanguages })`.
- At the top of the component:
  ```ts
  const { primary } = languages;
  const other: Locale = primary === "es" ? "en" : "es";
  const [edit, setEdit] = useState<Locale>(primary);
  const titleKey = localeKey("title", edit) as "title" | "titleEn";
  const descriptionKey = localeKey("description", edit) as "description" | "descriptionEn";
  const validate = (row: TaxonomyRow, locale: Locale) => (kind === "category" ? validateCategory(row, locale) : validateBrand(row, locale));
  ```
- `visible` filter: `rows.filter((row) => !q || row.title.toLowerCase().includes(q) || row.titleEn.toLowerCase().includes(q))`.
- `save`: `const checked = validate(editing, primary);`.
- List label: `{row.title || row.titleEn || "Sin título"}`.
- First child inside the drawer body (`<div className="flex-1 overflow-y-auto …">`):
  ```tsx
  {languages.languages.length > 1 && (
    <EditorLocale value={edit} onChange={setEdit} missing={lacksLanguage(validate(editing, other), other) ? [other] : []} />
  )}
  ```
- Título and Descripción fields:
  ```tsx
  <TextField label="Título" value={editing[titleKey]} max={80} error={errors[titleKey]}
    onChange={(text) => update((slugTouched || edit !== primary ? { [titleKey]: text } : { [titleKey]: text, slug: slugify(text) }) as Partial<TaxonomyRow>)} />
  ```
  and
  ```tsx
  <TextField label="Descripción" value={editing[descriptionKey]} max={500} multiline error={errors[descriptionKey]}
    onChange={(text) => update({ [descriptionKey]: text } as Partial<TaxonomyRow>)} />
  ```

- [ ] **Step 4: Apariencia**

`app/(admin)/admin/apariencia/page.tsx`:
- Import `getServerLocale` from `@/lib/locale`.
- Add it to the `Promise.all`: `const [settings, hasDraft, { categories }, previewLocale] = await Promise.all([…, getServerLocale()]);`.
- Pass `previewLocale={previewLocale}` (Ruling R3: the selector starts on the language the preview already shows).

`components/admin/appearance/AppearanceEditor.tsx`:
- Imports: `EditorLocale` (`../EditorLocale`), `LOCALE_COOKIE` and `type Locale` from `@/lib/i18n`.
- Props: add `previewLocale: Locale`.
- State: `const [edit, setEdit] = useState<Locale>(previewLocale);`.
- Add:
  ```ts
  // The preview follows the language being edited: same cookie as the store's ES/EN button.
  const changeEdit = (locale: Locale) => {
    setEdit(locale);
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    frameRef.current?.contentWindow?.location.reload();
  };
  ```
- In the top bar, right after the tab list `</div>`, add `{initial.languages.length > 1 && <EditorLocale value={edit} onChange={changeEdit} />}`.
- Pass the language to the sections:
  - `edit={edit}` to `IdentitySection`, `ContactSection` and `SectionForm`;
  - `edit={edit} primary={initial.primary}` to `BannerSection`.

`components/admin/brand/IdentitySection.tsx`:
- Props: `({ initial, edit, ...events }: { initial: IdentitySettings; edit: Locale } & AutosaveEvents)`.
- Add `const setText = (field: string, v: string) => setValue((prev) => ({ ...prev, [field]: v }));`.
- Replace the Eslogan and Descripción fields with:
  ```tsx
  <TextField label="Eslogan" {...twin(value, "tagline", edit, setText, errors)} max={80} />
  <TextField label="Descripción" multiline {...twin(value, "description", edit, setText, errors)} max={300} />
  ```
- Import `twin` from `./fields` and `type Locale` from `@/lib/i18n`.

`components/admin/brand/BannerSection.tsx`:
- Props: `({ initial, edit, primary, ...events }: { initial: BannerSettings; edit: Locale; primary: Locale } & AutosaveEvents)`.
- Validator: `useAutosave(value, (input) => validateBanner(input, primary), (v) => saveAppearanceDraft("banner", v), events)`.
- Add `const setText = (field: string, v: string) => setValue((prev) => ({ ...prev, [field]: v }));` and `const labelKey = localeKey("label", edit) as "label" | "labelEn";`.
- Badge, Título, Parte resaltada, Subtítulo and Descripción use `{...twin(value, "<name>", edit, setText, errors)}`, keeping each label and `max`.
- CTA label field: `value={value[key][labelKey]} onChange={(v) => setCta(key, labelKey, v)} error={errors[`${key}.${labelKey}`]}`.
- `setStat`'s `field` type becomes `"value" | "label" | "labelEn"`. The stat label field becomes `value={stat[labelKey]} onChange={(v) => setStat(i, labelKey, v)} error={errors[`stats.${i}.${labelKey}`]}`.
- Imports: `twin`, `localeKey`, `type Locale`.

`components/admin/brand/ContactSection.tsx`:
- Props: `({ initial, edit, ...events }: { initial: ContactSettings; edit: Locale } & AutosaveEvents)`.
- `FIELDS` becomes:
  ```ts
  const FIELDS: { key: "email" | "phone" | "address" | "hours"; label: string; max: number; translated?: boolean }[] = [
    { key: "email", label: "Correo", max: 254 },
    { key: "phone", label: "Teléfono", max: 80 },
    { key: "address", label: "Dirección", max: 80, translated: true },
    { key: "hours", label: "Horario", max: 80, translated: true },
  ];
  ```
- The map:
  ```tsx
  {FIELDS.map(({ key, label, max, translated }) => {
    const field = (translated ? localeKey(key, edit) : key) as keyof ContactSettings;
    return (
      <TextField key={key} label={label} value={value[field]} onChange={(v) => setValue((prev) => ({ ...prev, [field]: v }))} error={errors[field]} max={max} />
    );
  })}
  ```

`components/admin/appearance/SectionForm.tsx`:
- `SectionForm` gets an `edit: Locale` prop and passes it to `<Fields … edit={edit} />`.
- `Fields` gets `edit`. Inside it:
  ```ts
  const titleKey = localeKey("title", edit) as "title" | "titleEn";
  const textKey = localeKey("text", edit) as "text" | "textEn";
  const labelKey = localeKey("label", edit) as "label" | "labelEn";
  const title = <TextField label="Título" value={s[titleKey]} onChange={(v) => set(titleKey, v)} error={errors[titleKey]} max={80} />;
  const text = (max: number, label = "Texto") => (
    <TextField label={label} multiline value={s[textKey]} onChange={(v) => set(textKey, v)} error={errors[textKey]} max={max} />
  );
  ```
- Button label field: `value={s.button[labelKey]} onChange={(v) => set("button", { ...s.button, [labelKey]: v })} error={errors[`button.${labelKey}`]}`.
- `Testimonials` gets `edit`. Its Opinión field:
  ```tsx
  <TextField label="Opinión" multiline value={t[textKey]} onChange={(v) => update(i, { [textKey]: v } as Partial<Testimonial>)} error={errors[`items.${i}.${textKey}`]} max={300} />
  ```
  with `const textKey = localeKey("text", edit) as "text" | "textEn";` inside `Testimonials`. Pass `edit={edit}` where `Fields` renders `<Testimonials …>`.

- [ ] **Step 5: Páginas**

`app/(admin)/admin/paginas/page.tsx`: `const { pages, languages, primary } = await getSiteSettings();` and `<PagesTab initialPages={pages} languages={{ languages, primary }} />`.

`components/admin/pages/PagesTab.tsx`:
- Imports: `EditorLocale`, `type Locale`, `lacksLanguage`, `localeKey`, `type StoreLanguages`.
- Props: `({ initialPages, languages }: { initialPages: Record<PageKey, PageContent>; languages: StoreLanguages })`.
- Add:
  ```ts
  const { primary } = languages;
  const other: Locale = primary === "es" ? "en" : "es";
  const [edit, setEdit] = useState<Locale>(primary);
  const introKey = localeKey("intro", edit) as "intro" | "introEn";
  ```
- `useSave((input) => validatePage(input, primary), …)`.
- Right before `<SectionCard …>`, add:
  ```tsx
  {languages.languages.length > 1 && (
    <EditorLocale value={edit} onChange={setEdit} missing={lacksLanguage(validatePage(draft, other), other) ? [other] : []} />
  )}
  ```
- Introducción field: `value={draft[introKey]} onChange={(v) => setDraft((d) => ({ ...d, [introKey]: v }))} error={errors[introKey]}`.
- `<BlockEditor … edit={edit} />`.

`components/admin/pages/BlockEditor.tsx`:
- Prop `edit: Locale`.
- Add `const titleKey = localeKey("title", edit) as "title" | "titleEn";` and `const textKey = localeKey("text", edit) as "text" | "textEn";`.
- Título: `value={block[titleKey]} onChange={(v) => update(i, { [titleKey]: v } as Partial<ContentBlock>)} error={errors[`blocks.${i}.${titleKey}`]}`.
- Texto: `value={block[textKey]} onChange={(v) => update(i, { [textKey]: v } as Partial<ContentBlock>)} error={errors[`blocks.${i}.${textKey}`]}`.

- [ ] **Step 6: Verify (code)**

- Run the test, typecheck and lint commands (lint: every file in this task's list). Expected: `check-permissions: ok`, no output, no output.

- [ ] **Step 7: Verify (browser, ZZ data)**

Note the language setting first. All steps use the signed-in superadmin in a new tab.

1. **Producto.**
   - Productos → Nuevo producto. Selector "Español | Inglés" visible (both languages).
   - Nombre (Español) `ZZ Parlante` sets the slug `zz-parlante`. Badge "Falta inglés" appears.
   - Switch to Inglés, Nombre `ZZ Speaker`. Expected: the slug stays and the badge disappears.
   - Precio `1`. Wait for "Guardando borrador…" to clear, then Publicar.
2. **Tienda.** Open `/` in a new tab, search `Speaker`.
   - Expected: the product shows as "ZZ Speaker" in EN and "ZZ Parlante" in ES.
   - Add it to the cart. The cart shows the name in the current language and switches with ES/EN.
   - Empty the cart afterwards.
3. **Validación.**
   - Ajustes → "Español e inglés", principal Inglés → Guardar.
   - Nuevo producto, Nombre in Español only. Switch the selector to Inglés.
   - Expected: "Campo obligatorio (inglés)" under Nombre, and no draft saved (no "Borrador guardado").
   - Leave the page without publishing. Restore the language setting.
4. **Apariencia.** First check whether a draft already exists ("Cambios sin publicar" badge). If it exists, skip this step and report it.
   - Selector Inglés, then Inicio → Banner principal → Título `ZZ Hello`.
   - Expected: after the autosave the preview shows "ZZ Hello".
   - Then click Descartar → confirm. This draft was created by this test.
5. **Páginas.**
   - Nosotros → selector Inglés. The first block's Título shows "Shipping" (default) or empty (stored Spanish content).
   - Do not save.
6. **Cleanup.**
   - Delete `ZZ Parlante` from the product editor (Borrar → Borrar). If the action is denied, report the product id for the user to delete.
   - Run `read.mjs 'count(*[_type == "product" && name match "ZZ*"])'`. Expected: `0`.
   - Run `read.mjs '*[_id == "siteSettings"][0]{languages, defaultLocale}'`. Expected: the setting noted at the start.

- [ ] **Step 8: Stage**

```bash
git add components/admin/EditorLocale.tsx components/admin/brand/fields.tsx components/admin/products/ProductEditor.tsx "app/(admin)/admin/productos/[id]/page.tsx" components/admin/catalog/TaxonomyManager.tsx "app/(admin)/admin/categorias/page.tsx" "app/(admin)/admin/marcas/page.tsx" components/admin/appearance/AppearanceEditor.tsx "app/(admin)/admin/apariencia/page.tsx" components/admin/brand/IdentitySection.tsx components/admin/brand/BannerSection.tsx components/admin/brand/ContactSection.tsx components/admin/appearance/SectionForm.tsx components/admin/pages/PagesTab.tsx components/admin/pages/BlockEditor.tsx "app/(admin)/admin/paginas/page.tsx"
```

---

### Task 10: Order emails in the order's language

**Files:**
- Modify: `sanity/schemaTypes/orderType.ts`
- Modify: `lib/orders.ts`
- Modify (whole file): `lib/email.ts`
- Modify: `app/(client)/api/admin/orders/update-status/route.ts`

**Interfaces:**
- Consumes: `Locale`; `getSiteSettings().primary`.
- Produces:
  - `sendOrderConfirmationEmail(customerEmail, customerName, orderNumber, totalPrice, products, invoiceUrl?, currency = "USD", locale: Locale = "es")`.
  - `sendInvoiceEmail(customerEmail, customerName, orderNumber, invoiceUrl, invoiceNumber, locale: Locale = "es")`.
  - The `order` document gains `locale`.

- [ ] **Step 1: The order keeps its language**

`sanity/schemaTypes/orderType.ts`: right before the `orderDate` field, add:

```ts
    defineField({
      name: "locale",
      title: "Idioma",
      type: "string",
      description: "Idioma en que el cliente compró; los correos del pedido salen en este idioma.",
      readOnly: true,
      options: { list: [{ title: "Español", value: "es" }, { title: "Inglés", value: "en" }] },
    }),
```

`lib/orders.ts`:
- Add `import type { Locale } from "@/lib/i18n";`.
- Add `locale,` to the destructured `session.metadata`. Right after `const parsedAddress = …`, add `const orderLocale: Locale = locale === "en" ? "en" : "es";`.
- In `backendClient.create({…})`, add `locale: orderLocale,` after `status: "paid",`.
- In the `sendOrderConfirmationEmail(…)` call, add `orderLocale` as the last argument (after the currency argument).

- [ ] **Step 2: Email texts in both languages**

Replace `lib/email.ts` with:

```ts
import { addUsage, getMailer } from "@/lib/mailer";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { THEMES } from "@/constants/themes";
import { formatPrice } from "@/constants/currencies";
import type { Locale } from "@/lib/i18n";

// Store name and palette for emails. getSiteSettings never throws: neutral defaults if Sanity is down.
async function emailBrand() {
  const { storeName, theme } = await getSiteSettings();
  const { primary, light, accent, bg } = THEMES[theme];
  return { storeName, theme: { primary, light, accent, bg } };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const mailer = await getMailer();
    if (!mailer) throw new Error("No hay correo de salida configurado (Ajustes → Correo o SMTP_*)");
    const info = await mailer.transporter.sendMail({ from: mailer.from, replyTo: mailer.replyTo, ...options });
    await addUsage(1).catch((error) => console.error("Could not count the sent email", error));
    return info;
  } catch (error) {
    console.error(`❌ Error sending email:`, error);
    throw error;
  }
}

// Order emails go out in the language the customer bought in (order.locale).
type EmailText = {
  confirmSubject: (order: string, store: string) => string;
  confirmTitle: string;
  confirmSubtitle: string;
  hello: (name: string) => string;
  paid: (amount: string, order: string) => string;
  details: string;
  product: string;
  quantity: string;
  price: string;
  total: string;
  processing: string;
  viewOrder: string;
  questions: string;
  rights: (year: number, store: string) => string;
  automatic: string;
  invoiceSubject: (order: string, store: string) => string;
  invoiceTitle: string;
  invoiceSubtitle: string;
  delivered: (order: string) => string;
  invoiceNumber: string;
  status: string;
  deliveredStatus: string;
  viewInvoice: string;
  stripeNote: string;
  invoiceQuestions: string;
  thanks: (store: string) => string;
};

const EMAIL_TEXT: Record<Locale, EmailText> = {
  es: {
    confirmSubject: (order, store) => `Confirmación de Pedido #${order} - ${store}`,
    confirmTitle: "¡Gracias por tu compra!",
    confirmSubtitle: "Tu pedido ha sido recibido correctamente",
    hello: (name) => `Hola ${name},`,
    paid: (amount, order) => `Confirmamos que hemos recibido tu pago de ${amount} para el pedido <strong>#${order}</strong>.`,
    details: "Detalles del Pedido",
    product: "Producto",
    quantity: "Cantidad",
    price: "Precio",
    total: "TOTAL:",
    processing: "Tu pedido está siendo procesado. Recibirás otro email con el seguimiento cuando sea enviado.",
    viewOrder: "📋 Ver Detalles del Pedido",
    questions: "Si tienes preguntas, contáctanos a través de nuestro sitio web.",
    rights: (year, store) => `&copy; ${year} ${store}. Todos los derechos reservados.`,
    automatic: "Este es un email automático, por favor no respondas directamente.",
    invoiceSubject: (order, store) => `Factura Pedido #${order} - ${store}`,
    invoiceTitle: "¡Pedido Entregado!",
    invoiceSubtitle: "Tu factura está lista",
    delivered: (order) => `Tu pedido <strong>#${order}</strong> ha sido entregado con éxito. ✅`,
    invoiceNumber: "Número de Factura:",
    status: "Estado:",
    deliveredStatus: "Entregado",
    viewInvoice: "👁️ Ver Factura y Recibo",
    stripeNote: "La página se abrirá de forma segura en Stripe donde podrás descargar tu factura y recibo en PDF.",
    invoiceQuestions: "Si tienes alguna pregunta o inconveniente, por favor contáctanos.",
    thanks: (store) => `Agradecemos tu preferencia en ${store}. ¡Esperamos volver a verte pronto! 🎉`,
  },
  en: {
    confirmSubject: (order, store) => `Order Confirmation #${order} - ${store}`,
    confirmTitle: "Thank you for your purchase!",
    confirmSubtitle: "Your order has been received",
    hello: (name) => `Hi ${name},`,
    paid: (amount, order) => `We've received your payment of ${amount} for order <strong>#${order}</strong>.`,
    details: "Order details",
    product: "Product",
    quantity: "Quantity",
    price: "Price",
    total: "TOTAL:",
    processing: "Your order is being processed. You'll get another email with tracking when it ships.",
    viewOrder: "📋 View order details",
    questions: "If you have any questions, contact us through our website.",
    rights: (year, store) => `&copy; ${year} ${store}. All rights reserved.`,
    automatic: "This is an automated email, please do not reply directly.",
    invoiceSubject: (order, store) => `Invoice for order #${order} - ${store}`,
    invoiceTitle: "Order delivered!",
    invoiceSubtitle: "Your invoice is ready",
    delivered: (order) => `Your order <strong>#${order}</strong> has been delivered. ✅`,
    invoiceNumber: "Invoice number:",
    status: "Status:",
    deliveredStatus: "Delivered",
    viewInvoice: "👁️ View invoice and receipt",
    stripeNote: "The page opens securely on Stripe, where you can download your invoice and receipt as PDF.",
    invoiceQuestions: "If you have any questions or issues, please contact us.",
    thanks: (store) => `Thank you for choosing ${store}. We hope to see you again soon! 🎉`,
  },
};

/**
 * Send confirmation email when order is paid
 */
export async function sendOrderConfirmationEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  totalPrice: number,
  products: Array<{ name: string; quantity: number; price: number; image?: string }>,
  invoiceUrl?: string,
  currency = "USD",
  locale: Locale = "es"
) {
  const { storeName, theme } = await emailBrand();
  const tx = EMAIL_TEXT[locale];

  const productsHTML = products
    .map(
      (p) =>
        `<tr>
      <td style="padding: 15px; border-bottom: 1px solid #eee;">
        ${
          p.image
            ? `<img src="${p.image}" alt="${p.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px; vertical-align: middle;">`
            : ""
        }
        <span style="vertical-align: middle;">${p.name}</span>
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: center;">x${p.quantity}</td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(p.price, currency)}</td>
    </tr>`
    )
    .join("");

  const amount = `<strong style="color: ${theme.accent};">${formatPrice(totalPrice, currency)}</strong>`;
  const html = `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.light} 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px; background: ${theme.bg}; border-radius: 8px; margin: 20px 0; }
        .order-summary { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid ${theme.light}; }
        .button { display: inline-block; background: ${theme.accent}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
        .button:hover { background: ${theme.primary}; }
        table { width: 100%; border-collapse: collapse; }
        .footer { text-align: center; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #ddd; margin-top: 20px; }
        .total-row { background: ${theme.bg} !important; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${tx.confirmTitle}</h1>
          <p>${tx.confirmSubtitle}</p>
        </div>

        <div class="content">
          <h2>${tx.hello(customerName)}</h2>
          <p>${tx.paid(amount, orderNumber)}</p>

          <div class="order-summary">
            <h3 style="color: ${theme.primary};">${tx.details}</h3>
            <table>
              <tr style="background: ${theme.primary}; color: white; font-weight: bold;">
                <td style="padding: 10px;">${tx.product}</td>
                <td style="padding: 10px; text-align: center;">${tx.quantity}</td>
                <td style="padding: 10px; text-align: right;">${tx.price}</td>
              </tr>
              ${productsHTML}
              <tr class="total-row">
                <td colspan="2" style="padding: 10px; text-align: right;">${tx.total}</td>
                <td style="padding: 10px; text-align: right;">${formatPrice(totalPrice, currency)}</td>
              </tr>
            </table>
          </div>

          <p>${tx.processing}</p>

          <p style="text-align: center;">
            <a href="#" class="button">${tx.viewOrder}</a>
          </p>

          <p>${tx.questions}</p>
        </div>

        <div class="footer">
          <p>${tx.rights(new Date().getFullYear(), storeName)}</p>
          <p>${tx.automatic}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,
    subject: tx.confirmSubject(orderNumber, storeName),
    html,
  });
}

/**
 * Send invoice email when order is delivered
 */
export async function sendInvoiceEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  invoiceUrl: string,
  invoiceNumber: string,
  locale: Locale = "es"
) {
  const { storeName, theme } = await emailBrand();
  const tx = EMAIL_TEXT[locale];
  const html = `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.light} 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px; background: ${theme.bg}; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: ${theme.accent}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
        .button:hover { background: ${theme.primary}; }
        .info-box { background: white; padding: 15px; border-radius: 5px; border-left: 4px solid ${theme.light}; margin: 15px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #ddd; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${tx.invoiceTitle}</h1>
          <p>${tx.invoiceSubtitle}</p>
        </div>

        <div class="content">
          <h2>${tx.hello(customerName)}</h2>
          <p>${tx.delivered(orderNumber)}</p>

          <div class="info-box">
            <p><strong>${tx.invoiceNumber}</strong> #${invoiceNumber}</p>
            <p style="margin: 0; color: ${theme.primary};"><strong>${tx.status}</strong> ${tx.deliveredStatus}</p>
          </div>

          <p style="text-align: center; margin: 20px 0;">
            <a href="${invoiceUrl}" target="_blank" rel="noopener noreferrer" class="button">${tx.viewInvoice}</a>
          </p>

          <p style="text-align: center; color: #666; font-size: 14px;">${tx.stripeNote}</p>

          <p>${tx.invoiceQuestions}</p>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">${tx.thanks(storeName)}</p>
        </div>

        <div class="footer">
          <p>${tx.rights(new Date().getFullYear(), storeName)}</p>
          <p>${tx.automatic}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,
    subject: tx.invoiceSubject(orderNumber, storeName),
    html,
  });
}
```

- [ ] **Step 3: Invoice uses the order's language**

`app/(client)/api/admin/orders/update-status/route.ts`:
- Add `import { getSiteSettings } from "@/sanity/queries/siteSettings";`.
- In the `orderBefore` projection, add `locale`: `{ email, customerName, orderNumber, invoice, locale }`.
- Right before `await sendInvoiceEmail(`, add:
  ```ts
          // Orders from before the language was saved use the store's main language.
          const locale = orderBefore.locale === "en" || orderBefore.locale === "es" ? orderBefore.locale : (await getSiteSettings()).primary;
  ```
- Add `locale` as the last argument of `sendInvoiceEmail(…)`.

- [ ] **Step 4: Verify**

- Run the test, typecheck and lint commands. Lint target: `npx eslint lib/email.ts lib/orders.ts sanity/schemaTypes/orderType.ts "app/(client)/api/admin/orders/update-status/route.ts"`. Expected: `check-permissions: ok`, no output, no output.
- Live sending needs a real Stripe checkout and SMTP (Ruling R4). In the report, say how you checked the code path instead:
  - `metadata.locale` → `orderLocale` → `order.locale` and the confirmation email;
  - `order.locale` (or the main language) → the invoice email.

- [ ] **Step 5: Stage**

```bash
git add sanity/schemaTypes/orderType.ts lib/orders.ts lib/email.ts "app/(client)/api/admin/orders/update-status/route.ts"
```

---

### Task 11: One language per campaign

**Files:**
- Modify: `lib/newsletter.ts` (`CampaignContent.language`, `EMPTY_CAMPAIGN`, `validateCampaign`)
- Modify: `lib/campaignEmail.ts` (footer in the campaign's language)
- Modify: `sanity/queries/newsletter.ts` (campaign `language`, product `nameEn`, search)
- Modify: `lib/campaignSend.ts` (`getEmailBrand`, `toPickerProduct`, `runBatch`)
- Modify: `lib/unsubscribe.ts` (`l` in the page link)
- Modify: `actions/newsletterAdmin.ts` (`campaignFields`, `sendCampaignTest`, readiness address)
- Modify: `components/admin/newsletter/CampaignEditor.tsx`, `app/(admin)/admin/boletin/[id]/page.tsx`
- Modify: `app/(client)/boletin/baja/page.tsx`, `components/UnsubscribeForm.tsx`, `lib/i18n.ts`
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes:
  - Task 1 `resolveLocale`, `StoreLanguages`.
  - Task 7 `localizeEmailBrand`, `localizeEmailProducts`.
  - Task 9 `EditorLocale`.
- Produces:
  - `CampaignContent.language: Locale | null` (`null` means the store's main language).
  - `renderCampaignEmail({ …, language?: Locale })` (default `"es"`).
  - `EmailBrand.addressEn?` and `EmailProduct.nameEn?`.
  - `getEmailBrand(): Promise<{ brand; currency; languages: StoreLanguages }>`.
  - `unsubscribeLinks(subscriberId, secret, base?, language?)`.

- [ ] **Step 1: Write the failing tests**

In the "Campaign email HTML" block, right before its closing `}`, add:

```js
  // Footer in the campaign's language; Spanish by default
  assert.ok(out.html.includes('<html lang="es">'));
  const enOut = ce.renderCampaignEmail({ content, products, brand, baseUrl: "https://tienda.com", unsubscribeUrl: "https://tienda.com/boletin/baja?l=en", language: "en" });
  assert.ok(enOut.html.includes('<html lang="en">'));
  assert.ok(enOut.html.includes("You&#39;re receiving this email because you subscribed at Tienda &amp; Co."));
  assert.ok(enOut.html.includes(">Unsubscribe</a>"));
  assert.ok(!enOut.html.includes("Darte de baja"));
  assert.ok(enOut.text.includes("Unsubscribe: https://tienda.com/boletin/baja?l=en"));
```

In the "Newsletter rules" block, after `assert.ok(nl.validateCampaign({ ...content, subject: "", title: "" }).ok); // drafts may be empty`, add:

```js
  assert.equal(nl.EMPTY_CAMPAIGN.language, null);
  assert.equal(nl.validateCampaign({ ...content, language: "en" }).value.language, "en");
  assert.equal(nl.validateCampaign({ ...content, language: "fr" }).value.language, null);
  assert.equal(nl.validateCampaign(content).value.language, null);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL (`<html lang="es">` assert).

- [ ] **Step 3: Content and email**

`lib/newsletter.ts`:
- Add `import type { Locale } from "./i18n";`.
- `CampaignContent`: add `language: Locale | null;` with the comment `// null: the store's main language`.
- `EMPTY_CAMPAIGN`: add `language: null,`.
- `validateCampaign` returned object: add `language: v.language === "es" || v.language === "en" ? v.language : null,`.

`lib/campaignEmail.ts`:
- Add `import type { Locale } from "./i18n";`.
- `EmailProduct` becomes `{ name: string; nameEn?: string; url: string; imageUrl: string | null; price: string }`. `EmailBrand` gains `addressEn?: string`.
- `CampaignEmailInput` gains `language?: Locale;`.
- Above `renderCampaignEmail`, add:

```ts
// Footer lines in the campaign's language. Product names and the address arrive already in it.
const FOOTER: Record<Locale, { reason: (store: string) => string; unsubscribe: string }> = {
  es: { reason: (store) => `Recibes este correo porque te suscribiste en ${store}.`, unsubscribe: "Darte de baja" },
  en: { reason: (store) => `You're receiving this email because you subscribed at ${store}.`, unsubscribe: "Unsubscribe" },
};
```

- Signature: `export function renderCampaignEmail({ content, products, brand, baseUrl, unsubscribeUrl, language = "es" }: CampaignEmailInput) {`. Add `const footer = FOOTER[language];` as its first line.
- In `html`: `<html lang="es">` becomes `<html lang="${language}">`. The footer paragraph becomes:
  ```
  <p style="${FONT};margin:0;font-size:12px;color:#6b7280">${esc(footer.reason(brand.storeName))} <a href="${esc(unsubscribeUrl)}" style="color:#6b7280">${footer.unsubscribe}</a></p>
  ```
- In `text`: the two last lines become `footer.reason(brand.storeName),` and `` `${footer.unsubscribe}: ${unsubscribeUrl}`, ``.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: `check-permissions: ok`.

- [ ] **Step 5: Storage, sending and the test email**

`sanity/queries/newsletter.ts`:
- `CampaignRaw`: add `language?: Locale | null;` (import the `Locale` type from `@/lib/i18n`).
- `CAMPAIGN` projection: add `language,` after `button,`.
- `toCampaign` content: add `language: raw.language === "es" || raw.language === "en" ? raw.language : null,`.
- `EmailProductDoc`: add `nameEn: string | null;`.
- `PRODUCT_FIELDS`: `{ _id, name, nameEn, price, "slug": slug.current, "image": images[0].asset->url }`.
- `searchProductDocs` filter: `` const filter = term ? `${PUBLISHED_PRODUCT} && (name match $q || nameEn match $q)` : PUBLISHED_PRODUCT; ``.

`lib/unsubscribe.ts`:
- Add `import type { Locale } from "@/lib/i18n";`.
- Replace `unsubscribeLinks` with:

```ts
// page: the store page with the "Darme de baja" button, in the email's language (l). l is not
// signed: it only picks the page's language. oneClick: the List-Unsubscribe target.
export function unsubscribeLinks(subscriberId: string, secret: string, base = siteUrl(), language?: Locale) {
  const query = `s=${encodeURIComponent(subscriberId)}&t=${signUnsubscribe(subscriberId, secret)}`;
  return {
    page: `${base}/boletin/baja?${query}${language ? `&l=${language}` : ""}`,
    oneClick: `${base}/api/boletin/baja?${query}`,
  };
}
```

`lib/campaignSend.ts`:
- Imports: `import { localizeEmailBrand, localizeEmailProducts, resolveLocale, type StoreLanguages } from "@/lib/localize";`.
- `getEmailBrand`:
  - Its return type becomes `Promise<{ brand: EmailBrand; currency: CurrencyCode; languages: StoreLanguages }>`.
  - Add `addressEn: s.contact.addressEn,` after `address` in `brand`.
  - Add `languages: { languages: s.languages, primary: s.primary },` to the returned object.
- `toPickerProduct`: add `nameEn: doc.nameEn ?? "",`.
- In `runBatch`, replace the two lines
  ```ts
  const { brand, currency } = await getEmailBrand();
  const products = await loadEmailProducts(campaign.content.products, currency);
  ```
  with
  ```ts
  const { brand: storeBrand, currency, languages } = await getEmailBrand();
  // Campaigns saved before languages existed, or in one the store dropped, go out in the main language.
  const language = resolveLocale(campaign.content.language, languages);
  const brand = localizeEmailBrand(storeBrand, language);
  const products = localizeEmailProducts(await loadEmailProducts(campaign.content.products, currency), language);
  ```
- In `runBatch`'s loop:
  - `const links = unsubscribeLinks(subscriber._id, secret, base, language);`
  - add `language` to the `renderCampaignEmail({ … })` argument.

`actions/newsletterAdmin.ts`:
- Imports: `import { localizeEmailBrand, localizeEmailProducts, resolveLocale } from "@/lib/localize";`.
- `campaignFields`: add `...(content.language ? { language: content.language } : {}),` after `button`.
- In `sendCampaignTest`, replace from `const { brand, currency } = await getEmailBrand();` through the `renderCampaignEmail` line with:

```ts
    const { brand, currency, languages } = await getEmailBrand();
    const language = resolveLocale(campaign.content.language, languages);
    const products = localizeEmailProducts(await loadEmailProducts(campaign.content.products, currency), language);
    const email = renderCampaignEmail({
      content: campaign.content,
      products,
      brand: localizeEmailBrand(brand, language),
      baseUrl: siteUrl(),
      unsubscribeUrl: `${siteUrl()}/boletin/baja?l=${language}`,
      language,
    });
```

  and change the subject to `` subject: `${language === "en" ? "[Test]" : "[Prueba]"} ${email.subject}`, ``.
- In `startCampaign` (and any other `sendReadiness(brand.address)` call in the file), pass `brand.address || brand.addressEn || ""` instead of `brand.address`.

`app/(admin)/admin/boletin/[id]/page.tsx`:
- `const { brand, currency, languages } = await getEmailBrand();`.
- `sendReadiness(brand.address || brand.addressEn || "")`.
- Pass `languages={languages}` to `CampaignEditor`.

`components/admin/newsletter/CampaignEditor.tsx`:
- Imports: `EditorLocale` (`../EditorLocale`) and `import { localizeEmailBrand, localizeEmailProducts, resolveLocale, type StoreLanguages } from "@/lib/localize";`.
- `EditorProps`: add `languages: StoreLanguages;`, and destructure it.
- After `const set = …`, add `const language = resolveLocale(content.language, languages);`.
- `preview` becomes:
  ```ts
  const preview = useMemo(
    () =>
      renderCampaignEmail({
        content,
        products: localizeEmailProducts(chosen, language),
        brand: localizeEmailBrand(brand, language),
        baseUrl,
        unsubscribeUrl: `${baseUrl}/boletin/baja`,
        language,
      }).html,
    [content, chosen, brand, baseUrl, language]
  );
  ```
- First child of the `<fieldset disabled={!editable} …>`:
  ```tsx
  {languages.languages.length > 1 && (
    <div>
      <span className="text-xs font-semibold text-gray-700">Idioma de la campaña</span>
      <div className="mt-1">
        <EditorLocale value={language} onChange={(locale) => set("language", locale)} label="Idioma de la campaña" />
      </div>
    </div>
  )}
  ```

- [ ] **Step 6: Unsubscribe page in the email's language**

`lib/i18n.ts`: add to `Messages`, `es` and `en`:

| key | es | en |
|---|---|---|
| `unsubscribePageTitle` | `Darse de baja` | `Unsubscribe` |
| `unsubscribeTitle` | `¿Dejar de recibir correos de {store}?` | `Stop receiving emails from {store}?` |
| `unsubscribeButton` | `Darme de baja` | `Unsubscribe` |
| `unsubscribeProcessing` | `Procesando…` | `Processing…` |
| `unsubscribeDone` | `Listo, ya no recibirás correos de {store}.` | `Done. You won't receive emails from {store} anymore.` |
| `unsubscribeFailed` | `No pudimos procesar la baja. Intenta de nuevo.` | `We couldn't process your request. Please try again.` |
| `unsubscribeInvalid` | `Este enlace no es válido.` | `This link is not valid.` |

Replace `app/(client)/boletin/baja/page.tsx` with:

```tsx
import type { Metadata } from "next";
import Container from "@/components/Container";
import UnsubscribeForm from "@/components/UnsubscribeForm";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/locale";
import { resolveLocale } from "@/lib/localize";
import { isValidUnsubscribe } from "@/lib/unsubscribe";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

type Params = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Params> };

// The email's language (l) when the store offers it; else the visitor's language.
async function pageLocale(params: Params) {
  const [{ languages }, visitor] = await Promise.all([getSiteSettings(), getServerLocale()]);
  return resolveLocale(params.l, { languages, primary: visitor });
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = await pageLocale(await searchParams);
  return { title: t(locale, "unsubscribePageTitle"), robots: { index: false, follow: false } };
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const s = typeof params.s === "string" ? params.s : "";
  const sig = typeof params.t === "string" ? params.t : "";
  const [locale, { storeName }] = await Promise.all([pageLocale(params), getSiteSettings()]);
  return (
    <Container className="py-16">
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 p-8 text-center">
        {isValidUnsubscribe(s, sig) ? (
          <UnsubscribeForm subscriberId={s} signature={sig} storeName={storeName} locale={locale} />
        ) : (
          <p className="text-gray-700">{t(locale, "unsubscribeInvalid")}</p>
        )}
      </div>
    </Container>
  );
}
```

`components/UnsubscribeForm.tsx`:
- Add the prop `locale: Locale`, and import `t` and `type Locale` from `@/lib/i18n`.
- Replace the texts:
  - the done text with `{t(locale, "unsubscribeDone", { store: storeName })}`;
  - the title with `{t(locale, "unsubscribeTitle", { store: storeName })}`;
  - the button with `{pending ? t(locale, "unsubscribeProcessing") : t(locale, "unsubscribeButton")}`;
  - the error with `{t(locale, "unsubscribeFailed")}`.

- [ ] **Step 7: Verify**

- Run the test, typecheck and lint commands (lint: every file in this task's list). Expected: `check-permissions: ok`, no output, no output.
- Browser (privacy first):
  - Run `read.mjs 'count(*[_type=="subscriber" && coalesce(status,"active")=="active" && !(email match "zz-*")])'`. Note the number. Nothing in this check sends to subscribers.
  1. Boletín → Campañas → Nueva campaña. Fill Asunto `ZZ Idioma` and Título `ZZ Hello`.
     - Expected: "Idioma de la campaña" is visible (both languages).
     - Choose Inglés. Expected: the preview footer shows "Unsubscribe" and "You're receiving this email…".
     - Choose Español. Expected: "Darte de baja".
  2. "Enviarme una prueba" only if an Ethereal or test SMTP is configured in Ajustes → Correo. Otherwise skip it and report the reason. Do not configure SMTP: no secrets.
  3. Open `/boletin/baja?s=x&t=y&l=en`. Expected: "This link is not valid.". With `l=es`: "Este enlace no es válido.".
  4. Cleanup: delete the `ZZ Idioma` campaign from its editor (Borrar → Borrar). If denied, report its id. Then run `read.mjs 'count(*[_type == "campaign" && subject match "ZZ*"])'`. Expected: `0`.
- In the report, describe the code path checked for `runBatch`: `resolveLocale` → localized brand and products → `unsubscribeLinks(…, language)` → `renderCampaignEmail({ language })`.

- [ ] **Step 8: Stage**

```bash
git add lib/newsletter.ts lib/campaignEmail.ts sanity/queries/newsletter.ts lib/campaignSend.ts lib/unsubscribe.ts actions/newsletterAdmin.ts components/admin/newsletter/CampaignEditor.tsx "app/(admin)/admin/boletin/[id]/page.tsx" "app/(client)/boletin/baja/page.tsx" components/UnsubscribeForm.tsx lib/i18n.ts scripts/check-permissions.mjs
```

---

### Task 12: Leftover texts and basic SEO

**Files:**
- Modify: `lib/i18n.ts`
- Modify: `components/HomeCategories.tsx`, `components/ShopByBrands.tsx`, `components/HomeTabbar.tsx`, `components/QuantityButtons.tsx`, `components/ProductCharacteristics.tsx`, `app/not-found.tsx`, `constants/data.ts`
- Modify: `app/layout.tsx` (`generateMetadata`), `app/manifest.ts`

**Interfaces:**
- Consumes: `getServerLocale`, `getLocalizedSettings` (Task 8), `pickText` (Task 1).
- Produces: new `lib/i18n.ts` keys (table below).

- [ ] **Step 1: Keys**

Add every key to `Messages`, `es` and `en` in `lib/i18n.ts`. The existing test `assert.deepEqual(Object.keys(i18n.MESSAGES.en).sort(), Object.keys(i18n.MESSAGES.es).sort())` keeps both languages complete.

| key | es | en |
|---|---|---|
| `seeAll` | `Ver todo` | `See all` |
| `brandsSubtitle` | `Las mejores marcas del mercado` | `The best brands on the market` |
| `brandLabel` | `Marca` | `Brand` |
| `categoriesSubtitle` | `Explora por tipo de producto` | `Browse by product type` |
| `categoryLabel` | `Categoría` | `Category` |
| `categoryUnits` | `{count} uds` | `{count} items` |
| `perksShippingTitle` | `Envío gratis` | `Free shipping` |
| `perksShippingText` | `En pedidos superiores a {amount}` | `On orders over {amount}` |
| `perksReturnsTitle` | `Devoluciones` | `Returns` |
| `perksReturnsText` | `30 días sin preguntas` | `30 days, no questions asked` |
| `perksSupportTitle` | `Soporte 24/7` | `24/7 support` |
| `perksSupportText` | `Atención al cliente siempre disponible` | `Customer service always available` |
| `perksWarrantyTitle` | `Garantía total` | `Full warranty` |
| `perksWarrantyText` | `Calidad verificada por nuestro equipo` | `Quality checked by our team` |
| `quantityDecreased` | `Cantidad reducida` | `Quantity decreased` |
| `quantityIncreased` | `Cantidad aumentada` | `Quantity increased` |
| `productCharacteristics` | `{name}: características` | `{name}: characteristics` |
| `notFoundOr` | `o` | `or` |
| `linkAbout` | `Sobre nosotros` | `About us` |
| `linkContact` | `Contáctanos` | `Contact us` |
| `linkTerms` | `Términos y condiciones` | `Terms & Conditions` |
| `linkPrivacy` | `Política de privacidad` | `Privacy Policy` |
| `linkFaqs` | `Preguntas frecuentes` | `FAQs` |
| `linkHelp` | `Ayuda` | `Help` |

- [ ] **Step 2: Components**

- `constants/data.ts`, `getQuickLinksData`: each `locale === "en" ? … : …` becomes `t(locale, "<key>")`, using `linkAbout`, `linkContact`, `linkTerms`, `linkPrivacy`, `linkFaqs` and `linkHelp` in that order.
- `components/HomeTabbar.tsx`: `{locale === "en" ? "See all" : "Ver todo"}` becomes `{t(locale, "seeAll")}` (import `t` if missing).
- `app/not-found.tsx`: `{locale === "en" ? "or" : "o"}` becomes `{t(locale, "notFoundOr")}`.
- `components/QuantityButtons.tsx`:
  - Take `locale` from `useStore()`, and import `t`.
  - `"Quantity Decreased successfully!"` becomes `t(locale, "quantityDecreased")`, and `"Quantity Increased successfully!"` becomes `t(locale, "quantityIncreased")`.
  - `"Can not add more than available stock"` becomes `t(locale, "addToCartCannotMore")` (existing key).
- `components/ProductCharacteristics.tsx`:
  - Add `const locale = await getServerLocale();` and import `getServerLocale` and `t`.
  - `{product?.name}: Characteristics` becomes `{t(locale, "productCharacteristics", { name: product?.name ?? "" })}`.
  - `{product?.stock ? "Available" : "Out of Stock"}` becomes `{product?.stock ? t(locale, "productInStock") : t(locale, "productOutOfStock")}` (existing keys).
- `components/HomeCategories.tsx`:
  - Make the component `async`, add `const locale = await getServerLocale();`, and import `getServerLocale` and `t`.
  - Remove the default `= "Categorías populares"`: the section always passes its title.
  - `Explora por tipo de producto` becomes `{t(locale, "categoriesSubtitle")}`; the link text `Ver todo` becomes `{t(locale, "seeAll")}`; `Categoría` becomes `{t(locale, "categoryLabel")}`.
  - `{category?.productCount ?? 0} uds` becomes `{t(locale, "categoryUnits", { count: String(category?.productCount ?? 0) })}`.
- `components/ShopByBrands.tsx`:
  - Remove the default `= "Compra por marca"`.
  - Move `extraData` inside the component, after:
    ```ts
    const [locale, { currency }] = await Promise.all([getServerLocale(), getSiteSettings()]);
    const amount = formatPrice(CURRENCIES[currency].freeShippingFrom, currency, 0);
    ```
  - Build the four entries with the `perks*` keys; the shipping text is `t(locale, "perksShippingText", { amount })`.
  - `Las mejores marcas del mercado` becomes `{t(locale, "brandsSubtitle")}`, `Ver todo` becomes `{t(locale, "seeAll")}`, and `Marca` becomes `{t(locale, "brandLabel")}`.
  - Imports: `getServerLocale`, `t`, `getSiteSettings`, and `CURRENCIES, formatPrice` from `@/constants/currencies`.

- [ ] **Step 3: Metadata**

- `app/layout.tsx`, `generateMetadata`:
  - Replace `const { storeName, tagline, description, favicon } = await getSiteSettings();` with `const { storeName, tagline, description, favicon } = await getLocalizedSettings();`.
  - Import `getLocalizedSettings` from `@/lib/locale` (extend the existing `getServerLocale` import).
- `app/manifest.ts`:
  - `const { storeName, description, descriptionEn, theme, primary } = await getSiteSettings();`.
  - `description: pickText(description, descriptionEn, primary),` and `lang: primary,`.
  - Import `pickText` from `@/lib/localize`.

- [ ] **Step 4: Sweep for hardcoded Spanish in the store**

Run: `grep -rnE ">[^<{]*(Ver |Cargando|Agregar|Comprar|Envío|Categoría|Marca|Producto)[^<{]*<" --include=*.tsx components app | grep -v "components/admin\|app/(admin)"`.

Expected: no output. Any hit is in public code. Replace it with an `lib/i18n.ts` key (add the key to both languages) only if the file is in this task's list. Otherwise list it in the report as a deferred finding.

- [ ] **Step 5: Verify**

- Run the test, typecheck and lint commands (lint: every file in this task's list). Expected: `check-permissions: ok`, no output, no output.
- Browser, `/` in EN (header button):
  - "See all" next to the product tabs;
  - category cards say "Category" and "N items";
  - the perks strip in the brands section is in English;
  - footer quick links "About us", "Contact us", …
- Open `/no-existe` in EN. Expected: "… or …". Switch to ES: "… o …".
- Snippet `document.title`: in EN it uses the English tagline when the store has one (otherwise the Spanish one).

- [ ] **Step 6: Stage**

```bash
git add lib/i18n.ts components/HomeCategories.tsx components/ShopByBrands.tsx components/HomeTabbar.tsx components/QuantityButtons.tsx components/ProductCharacteristics.tsx app/not-found.tsx constants/data.ts app/layout.tsx app/manifest.ts
```
