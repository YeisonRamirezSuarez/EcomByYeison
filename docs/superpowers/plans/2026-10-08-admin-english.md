# Admin Panel in English Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every person who opens `/admin` can switch the whole panel between Spanish and English with an ES | EN selector, without changing the store.

**Architecture:** The Spanish text is the translation key. `lib/adminText/` holds one Spanish→English map per area and `tr(ui, "Guardar")`, typed so only texts that exist in the maps compile. A cookie `admin-locale` (default: the store's main language) gives the panel language: server code reads it with `getAdminLocale()`, client components with `useAdminLocale()`. Validators take the panel language as their last parameter (default Spanish, so the store is unchanged), and `run()` translates server errors.

**Tech Stack:** Next.js 16.1.6 (App Router, server actions), React 19.2, Clerk 7, Sanity 5, Tailwind v4, TypeScript (`typescript` is installed). Pure modules are tested with `node --experimental-strip-types scripts/check-permissions.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-08-admin-english-design.md`

## Global Constraints

**Scope**
- Only `/admin` changes language. The store, Sanity Studio, customer and subscriber emails, content the owner writes, and `console.*` logs are out of scope.
- No new dependencies. Do not run Sanity typegen.
- Cookie name: `admin-locale`, values `es` | `en`. No cookie or any other value → the store's main language (`getSiteSettings().primary`).

**Translation rules (every task)**
- The panel language variable is always named `ui`. Client components: `const ui = useAdminLocale();` (from `@/components/admin/AdminLocaleProvider`). Server components and server actions: `const ui = await getAdminLocale();` (from `@/lib/adminLocale`). Do not reuse the names `locale`, `edit` or `lang`: in the editors they already mean the **content** language.
- App code imports `tr` from `@/lib/adminText`. Pure `lib/` modules import it with the extension: `import { tr } from "./adminText/index.ts";` (allowed by `allowImportingTsExtensions`, added in Task 1). `import type` stays without extension.
- Every visible Spanish text becomes `tr(ui, "<the same Spanish text>")` and gets an entry in the task's area map (`lib/adminText/<area>.ts`) with its English. Keep the Spanish **character for character** (accents, `…`, `→`, final period or not), so the Spanish panel looks exactly as today.
- Texts built from pieces become one template with `{name}` variables: `` `Página ${page} de ${pages}` `` → `tr(ui, "Página {page} de {pages}", { page, pages })`. The English must use the same variable names.
- Plurals: two entries chosen in code, as today (`"1 suscriptor"` / `"{n} suscriptores"`).
- Fixed label maps (`ORDER_STATUS_LABELS`, `ROLE_LABELS`, `PRODUCT_STATE_LABELS`, `SECTION_LABELS`, `PAGE_LABELS`, `CONTENT_ICONS`, `STATUS_LABELS`, `SOURCE_LABELS`, `CAMPAIGN_STATUS_LABELS`, `LANGUAGE_NAMES`, `LANGUAGE_CHOICES`, `NAV_GROUPS` titles and labels, theme names): values stay in Spanish, typed so `tr` accepts them (`as const satisfies Record<K, AdminText>` or `label: AdminText`), and are shown with `tr(ui, MAP[key])`. `SOCIAL_LABELS` are brand names: show them as they are.
- Validators used by the panel take `ui: Locale = "es"` as their **last** parameter and pass it to their helpers. With no `ui` they must return exactly today's Spanish. Calls whose result feeds `lacksLanguage(...)` never pass `ui` (that check compares against Spanish).
- Server actions: `const ui = await getAdminLocale();` and pass `ui` to validators. Literal error returns use `tr(ui, …)`. Thrown owner messages use `new ActionError("<Spanish>", vars?)`; a message already built in `ui` uses `ActionError.raw(message)`.
- Dates: `toLocaleString(dateLocale(ui))` / `toLocaleDateString(dateLocale(ui))`. Prices keep `formatPrice` with the store currency.
- English style: plain US English, sentence case, short ("Save", "Delete", "Draft saved").
- Never translate: `Ecom`, `by Yeison`, `Ecom by Yeison`, brand names (Facebook, Instagram, TikTok, YouTube, X, WhatsApp, Stripe, Clerk, Sanity), codes (`SMTP`, `CSV`, `JPG`, `PNG`, `WEBP`, `SVG`, `URL`, `ES`, `EN`). If `check:admin-text` flags one of these, add it to `ALLOWED` in `scripts/check-admin-text.mjs`. If it flags a technical JSX prop (a value that is a code, not text), add the prop name to `TECHNICAL`. Record each addition in the task report.

**Exact texts (copy them as written)**
- Selector: buttons `ES` | `EN`; group `aria-label` `Idioma del panel` → `Panel language`.
- Tab title: `Administración | Ecom by Yeison` → `Admin | Ecom by Yeison` (`Administración` → `Admin`).
- `No tienes permiso para esta acción` → `You don't have permission for this action`.
- `No se pudo completar la acción` → `The action could not be completed`.
- `Campo obligatorio` → `Required`; `Campo obligatorio (español)` → `Required (Spanish)`; `Campo obligatorio (inglés)` → `Required (English)`.
- `Máximo {max} caracteres` → `Up to {max} characters`.
- `Revisa los campos marcados` → `Check the marked fields`.
- `Usa una ruta que empiece por / o un enlace https://` → `Use a path that starts with / or an https:// link`.
- `Solo JPG, PNG, WEBP o SVG de hasta 4 MB` → `Only JPG, PNG, WEBP or SVG up to 4 MB`.
- `Correo inválido` → `Invalid email`; `Debe ser un enlace https://` → `Must be an https:// link`; `Elige texto o imagen` → `Choose text or image`; `Opción inválida` → `Invalid option`.
- `Faltan secciones: {list}` → `Missing sections: {list}`; `Lista de secciones inválida` → `Invalid section list`.
- Home section labels: `Banner principal` → `Main banner`, `Productos por tipo` → `Products by type`, `Categorías` → `Categories`, `Marcas` → `Brands`, `Blog` → `Blog`.
- Content language: `Español` → `Spanish`, `Inglés` → `English`, `Falta español` → `Spanish missing`, `Falta inglés` → `English missing`.
- `Ver tienda` → `View store`.
- Menu groups and sections (use the same words wherever a message names a place in the panel): `Ventas` → `Sales`, `Tienda` → `Store`, `Inicio` → `Home`, `Pedidos` → `Orders`, `Productos` → `Products`, `Categorías` → `Categories`, `Marcas` → `Brands`, `Apariencia` → `Appearance`, `Páginas` → `Pages`, `Boletín` → `Newsletter`, `Usuarios` → `Users`, `Ajustes` → `Settings`. Inside them: `Datos de la tienda` → `Store data`, `Contacto` → `Contact`, `Correo` (the Ajustes tab) → `Email`.
- `Elige un número entre {min} y {max}` → `Choose a number between {min} and {max}`.

**Commands**
- Tests: `npm run -s check:permissions`. Expected last line: `check-permissions: ok`.
- Untranslated text: `npm run -s check:admin-text -- <paths>`. Expected when clean: last line `check-admin-text: 0 sin traducir`, exit code 0.
- Typecheck: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`. Expected: no output.
- Lint: `npx eslint <files touched>`. Expected: no new findings (these existed before and are not yours: `react-hooks/set-state-in-effect` in `components/FavoriteButton.tsx` and `components/ProductSideMenu.tsx`, `react-hooks/exhaustive-deps` in `components/CategoryProducts.tsx`).
- Build: `STRIPE_SECRET_KEY=sk_test_placeholder npm run build`. Expected: exit 0.

**Process rules**
- Implementers only stage (`git add`). They never commit, push, stash, reset or checkout. The controller commits after the user approves each message and account (ticket format: header `admin-english`, a blank line, then `- Se …` lines ending with a period; no AI attribution).
- Never name the company reference repository or its client anywhere: plans, code, comments, commits, docs or chat.
- Browser checks: dev server on port 3000 only (stop whatever holds 3000/3001 first). Never sign in, never type passwords or keys, never write to Sanity (no saving valid forms, no publishing, no creating or deleting documents). Only provoke errors that are rejected before any write. Native confirm dialogs freeze the browser tools: avoid buttons that open them.
- If an action is denied (by a person or a tool), do not work around it. Report it.

## Review Focus

1. Admin in English, content still missing its English twin: the editor badge must still say `English missing`. `lacksLanguage` compares against Spanish, so its validator calls must not pass `ui`. Test: Task 4 Step 1 (`lacksLanguage` assertion) and Task 11 browser check.
2. A tampered or old cookie (`admin-locale=fr`, empty): the panel must fall back to the store's main language, not crash. Test: Task 1 Step 1 (`pickAdminLocale`).
3. The store must not change: validators called without `ui` return today's Spanish, and the footer subscription still answers in the store language. Test: the Spanish assertions in Tasks 4, 6, 7, 8, 10, and Task 11 store check.
4. Messages with values (lengths, lists, counts) must show the values in English. Test: Task 1 (`Up to 60 characters`), Task 6 (`Missing sections: …`).
5. Errors answered by the server (not the browser) must come back in the panel language. Test: Task 8 Step 6 (Ajustes → Correo, which has no browser-side validation, saved with an empty server field returns `Required` and `Check the marked fields`, no write).

---

### Task 1: Text core, `.ts` imports and the untranslated-text check

**Files:**
- Modify: `tsconfig.json` (compilerOptions)
- Create: `lib/adminText/index.ts`, `lib/adminText/common.ts`, `lib/adminText/shell.ts`, `lib/adminText/catalog.ts`, `lib/adminText/orders.ts`, `lib/adminText/users.ts`, `lib/adminText/appearance.ts`, `lib/adminText/newsletter.ts`, `lib/adminText/settings.ts`, `lib/adminText/validation.ts`
- Create: `scripts/check-admin-text.mjs`
- Modify: `package.json` (scripts)
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: `type Locale = "es" | "en"` from `lib/i18n.ts`.
- Produces (from `lib/adminText/index.ts`): `tr(ui: Locale, text: AdminText, vars?: TextVars): string`; `type AdminText`; `type TextVars = Record<string, string | number>`; `AREAS` (the area maps); `ADMIN_LOCALE_COOKIE = "admin-locale"`; `pickAdminLocale(cookie: unknown, primary: Locale): Locale`; `dateLocale(ui: Locale): "en-US" | "es"`. Each area file exports a const map named after the file (`common`, `shell`, `catalog`, `orders`, `users`, `appearance`, `newsletter`, `settings`, `validation`).
- Produces: `npm run check:admin-text [-- paths...]`, and `node scripts/check-admin-text.mjs --self-test`.

- [ ] **Step 1: Write the failing test**

Add this block to `scripts/check-permissions.mjs` just before the final `console.log("check-permissions: ok");`:

```js
// Admin panel texts (lib/adminText): the Spanish text is the key, the area maps give the English
{
  const at = await import("../lib/adminText/index.ts");
  assert.equal(at.tr("es", "Administración"), "Administración");
  assert.equal(at.tr("en", "Administración"), "Admin");
  assert.equal(at.tr("es", "Máximo {max} caracteres", { max: 60 }), "Máximo 60 caracteres");
  assert.equal(at.tr("en", "Máximo {max} caracteres", { max: 60 }), "Up to 60 characters");
  assert.equal(at.tr("en", "Máximo {max} caracteres"), "Up to {max} characters"); // no vars: left as is

  // Panel language: the cookie if valid, else the store's main language
  assert.equal(at.ADMIN_LOCALE_COOKIE, "admin-locale");
  assert.equal(at.pickAdminLocale("en", "es"), "en");
  assert.equal(at.pickAdminLocale("es", "en"), "es");
  assert.equal(at.pickAdminLocale("fr", "en"), "en");
  assert.equal(at.pickAdminLocale("", "es"), "es");
  assert.equal(at.pickAdminLocale(undefined, "en"), "en");
  assert.equal(at.dateLocale("en"), "en-US");
  assert.equal(at.dateLocale("es"), "es");

  // Every map: English present, same {variables}, and one translation per Spanish text
  const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  const seen = new Map();
  for (const [area, map] of Object.entries(at.AREAS)) {
    for (const [es, en] of Object.entries(map)) {
      assert.ok(typeof en === "string" && en.trim().length > 0, `${area}: "${es}" has no English`);
      assert.equal(vars(en), vars(es), `${area}: "${es}" must keep its {variables}`);
      if (seen.has(es)) assert.equal(seen.get(es), en, `"${es}" is translated differently in two areas`);
      seen.set(es, en);
    }
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run -s check:permissions`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/adminText/index.ts`.

- [ ] **Step 3: Allow `.ts` imports between pure modules**

In `tsconfig.json`, inside `compilerOptions`, add after `"noEmit": true,`:

```json
    "allowImportingTsExtensions": true,
```

- [ ] **Step 4: Create the area maps**

`lib/adminText/common.ts`:

```ts
// Admin panel texts: Spanish (the key) → English. See lib/adminText/index.ts.
export const common = {
  "Administración": "Admin",
  "Idioma del panel": "Panel language",
  "No tienes permiso para esta acción": "You don't have permission for this action",
  "No se pudo completar la acción": "The action could not be completed",
} as const;
```

`lib/adminText/validation.ts` (messages shared by several validators, seeded now so later tasks do not add them twice):

```ts
// Admin panel texts: Spanish (the key) → English. See lib/adminText/index.ts.
export const validation = {
  "Campo obligatorio": "Required",
  "Campo obligatorio (español)": "Required (Spanish)",
  "Campo obligatorio (inglés)": "Required (English)",
  "Máximo {max} caracteres": "Up to {max} characters",
  "Revisa los campos marcados": "Check the marked fields",
  "Usa una ruta que empiece por / o un enlace https://": "Use a path that starts with / or an https:// link",
  "Solo JPG, PNG, WEBP o SVG de hasta 4 MB": "Only JPG, PNG, WEBP or SVG up to 4 MB",
  "Correo inválido": "Invalid email",
  "Debe ser un enlace https://": "Must be an https:// link",
  "Elige texto o imagen": "Choose text or image",
  "Opción inválida": "Invalid option",
  "Elige un número entre {min} y {max}": "Choose a number between {min} and {max}",
} as const;
```

The other seven files start empty, each with the same header comment. Example `lib/adminText/shell.ts`:

```ts
// Admin panel texts: Spanish (the key) → English. See lib/adminText/index.ts.
export const shell = {} as const;
```

Create `catalog.ts` (`export const catalog = {} as const;`), `orders.ts` (`orders`), `users.ts` (`users`), `appearance.ts` (`appearance`), `newsletter.ts` (`newsletter`) and `settings.ts` (`settings`) the same way.

- [ ] **Step 5: Create `lib/adminText/index.ts`**

```ts
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run -s check:permissions`
Expected: last line `check-permissions: ok`.

- [ ] **Step 7: Write the untranslated-text check**

Create `scripts/check-admin-text.mjs`:

```js
// Run: npm run check:admin-text [-- paths...]   (default: components/admin and app/(admin))
// Lists texts the admin panel shows without tr(...): JSX text, quoted JSX attributes that are not
// technical, text an {expression} inside JSX shows, and the first argument of toast*() and
// set*Error/Message/Notice(). Exits 1 when it finds any. `--self-test` checks the scanner itself.
// It does not see text constants in lib/: tsc (labels are AdminText) and the browser cover those.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

// Props whose quoted values are codes, not text. aria-* are technical except the ones read aloud.
const TECHNICAL = new Set([
  "className", "href", "src", "type", "name", "id", "key", "role", "rel", "target", "accept", "autoComplete",
  "inputMode", "method", "encType", "htmlFor", "variant", "size", "side", "align", "orientation", "value", "action",
  "defaultValue", "style", "lang", "dir", "form", "pattern", "step", "min", "max", "as", "sizes", "loading",
  "referrerPolicy", "sandbox", "allow", "d", "viewBox", "fill", "stroke", "strokeWidth", "xmlns", "section",
  "kind", "mode", "tab", "status", "position", "fetchPriority", "prefetch", "colSpan", "rowSpan", "rows", "cols",
  "width", "height", "tabIndex", "maxLength", "minLength",
]);
const SPOKEN_ARIA = new Set(["aria-label", "aria-description", "aria-valuetext", "aria-placeholder", "aria-roledescription"]);
// Texts that stay the same in both languages (brand names, codes, example values). Paths and
// links ("/shop", "https://") are skipped too.
const ALLOWED = new Set(["Ecom", "by Yeison", "Ecom by Yeison", "ES", "EN", "SMTP", "CSV", "URL", "JPG", "PNG", "WEBP", "SVG", "smtp.gmail.com"]);
const LINK = /^(\/|https?:\/\/)\S*$/;
const COMPARISON = [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken];

export function scan(file, code) {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const findings = [];
  const report = (node, raw) => {
    const text = raw.replace(/\s+/g, " ").trim();
    if (/\p{L}{2,}/u.test(text) && !ALLOWED.has(text) && !LINK.test(text)) {
      findings.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, text });
    }
  };
  const literalText = (node) =>
    ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
      ? node.text
      : ts.isTemplateExpression(node)
        ? [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ")
        : null;
  // What an expression shows: itself, both branches of ?:, the right side of &&, both sides of || and ??.
  const shown = (node) => {
    if (ts.isParenthesizedExpression(node)) return shown(node.expression);
    if (ts.isConditionalExpression(node)) {
      shown(node.whenTrue);
      shown(node.whenFalse);
      return;
    }
    if (ts.isBinaryExpression(node) && COMPARISON.includes(node.operatorToken.kind)) {
      if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) shown(node.left);
      shown(node.right);
      return;
    }
    const text = literalText(node);
    if (text !== null) report(node, text);
  };
  const visit = (node) => {
    if (ts.isJsxText(node)) report(node, node.text);
    else if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(source);
      const technical = TECHNICAL.has(name) || name.startsWith("data-") || (name.startsWith("aria-") && !SPOKEN_ARIA.has(name));
      if (!technical) {
        if (ts.isStringLiteral(node.initializer)) report(node, node.initializer.text);
        else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) shown(node.initializer.expression);
      }
    } else if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)) shown(node.expression);
    else if (ts.isCallExpression(node) && node.arguments[0]) {
      const callee = node.expression.getText(source);
      if (/^toast(\.\w+)?$/.test(callee) || /^set\w*(Error|Message|Notice)$/.test(callee)) shown(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

if (process.argv[2] === "--self-test") {
  const sample = `
    const A = ({ ui, n, ok }) => (
      <div className="p-2" aria-label="Menú" aria-hidden="true" title={tr(ui, "Guardar")}>
        Hola
        {tr(ui, "Borrar")}
        {ok ? "Listo" : tr(ui, "Error")}
        {\`\${n} de \${n}\`}
        {\`\${n}%\`}
        <Item label="Nombre" section="banner" value="all" />
        <form action="/admin/boletin"><input placeholder="/shop" /></form>
        Ecom
      </div>
    );
    toast.success("Guardado");
    setError(tr(ui, "Mal"));
    setFileError(ok && "Archivo raro");
  `;
  assert.deepEqual(scan("sample.tsx", sample).map((f) => f.text), ["Menú", "Hola", "Listo", "de", "Nombre", "Guardado", "Archivo raro"]);
  console.log("check-admin-text self-test: ok");
  process.exit(0);
}

const roots = process.argv.length > 2 ? process.argv.slice(2) : ["components/admin", "app/(admin)"];
const files = [];
const walk = (path) => {
  if (statSync(path).isDirectory()) for (const entry of readdirSync(path)) walk(join(path, entry));
  else if (/\.tsx?$/.test(path)) files.push(path);
};
roots.forEach(walk);

let total = 0;
for (const file of files) {
  for (const { line, text } of scan(file, readFileSync(file, "utf8"))) {
    console.log(`${file}:${line}: ${JSON.stringify(text)}`);
    total++;
  }
}
console.log(`check-admin-text: ${total} sin traducir`);
process.exit(total > 0 ? 1 : 0);
```

In `package.json` `scripts`, after `"check:permissions": …,` add:

```json
    "check:admin-text": "node scripts/check-admin-text.mjs",
```

- [ ] **Step 8: Run the self-test**

Run: `node scripts/check-admin-text.mjs --self-test`
Expected: `check-admin-text self-test: ok`.

- [ ] **Step 9: Record the starting point**

Run: `npm run -s check:admin-text`
Expected: exit code 1, many `path:line: "text"` lines, last line `check-admin-text: N sin traducir` with N = 383 (a dry run of this exact script on the current code). Write N in the task report (later tasks bring it to 0).

- [ ] **Step 10: Typecheck, lint and build**

Run the typecheck, `npx eslint lib/adminText scripts/check-admin-text.mjs`, and the build (Global Constraints → Commands).
Expected: typecheck no output; lint no findings; build exit 0 (proves Turbopack accepts the `.ts` imports).

- [ ] **Step 11: Stage**

```bash
git add tsconfig.json package.json lib/adminText scripts/check-admin-text.mjs scripts/check-permissions.mjs
```

---

### Task 2: Panel language (cookie, selector, layout, server errors)

**Files:**
- Create: `lib/adminLocale.ts`, `actions/adminLocale.ts`, `components/admin/AdminLocaleProvider.tsx`, `components/admin/shell/AdminLanguageToggle.tsx`
- Modify: `app/(admin)/admin/layout.tsx`, `components/admin/shell/Sidebar.tsx` (footer only), `lib/actionResult.ts`, `actions/newsletterAdmin.ts` (the `new ActionError(...)` lines), `lib/newsletter.ts` (`SMTP_UNREADABLE` type), `lib/campaignSend.ts` (`OTHER_TAB`, `SEND_FAILED` types), `lib/adminText/newsletter.ts`

**Interfaces:**
- Consumes: Task 1 `tr`, `AdminText`, `TextVars`, `ADMIN_LOCALE_COOKIE`, `pickAdminLocale`; `isLocale` from `lib/localize.ts`; `getSiteSettings` from `sanity/queries/siteSettings.ts`; `ClientClerkProvider` (`locale?: Locale` prop).
- Produces: `getAdminLocale(): Promise<Locale>` (`lib/adminLocale.ts`); `setAdminLocale(locale: unknown): Promise<void>` (`actions/adminLocale.ts`); `AdminLocaleProvider` and `useAdminLocale(): Locale` (`components/admin/AdminLocaleProvider.tsx`); `new ActionError(text: AdminText, vars?: TextVars)` and `ActionError.raw(message: string)`; `run()` answers in the panel language.

- [ ] **Step 1: Server side of the panel language**

`lib/adminLocale.ts`:

```ts
import { cookies } from "next/headers";
import { ADMIN_LOCALE_COOKIE, pickAdminLocale } from "@/lib/adminText";
import type { Locale } from "@/lib/i18n";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export { ADMIN_LOCALE_COOKIE };

// The panel's language for this person: their cookie, else the store's main language.
// Independent of the languages the store offers its customers.
export async function getAdminLocale(): Promise<Locale> {
  const [cookieStore, { primary }] = await Promise.all([cookies(), getSiteSettings()]);
  return pickAdminLocale(cookieStore.get(ADMIN_LOCALE_COOKIE)?.value, primary);
}
```

`actions/adminLocale.ts`:

```ts
"use server";

import { cookies } from "next/headers";
import { ADMIN_LOCALE_COOKIE } from "@/lib/adminText";
import { isLocale } from "@/lib/localize";

// Only a preference of this browser, so no permission is needed. Anything but "es"/"en" is ignored.
export async function setAdminLocale(locale: unknown): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(ADMIN_LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
```

- [ ] **Step 2: Client side: provider and selector**

`components/admin/AdminLocaleProvider.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect } from "react";
import type { Locale } from "@/lib/i18n";

const AdminLocaleContext = createContext<Locale>("es");

// The panel's language for client components. The root layout writes the store's language in
// <html lang>; inside the panel it is corrected here.
export function AdminLocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <AdminLocaleContext.Provider value={locale}>{children}</AdminLocaleContext.Provider>;
}

export const useAdminLocale = () => useContext(AdminLocaleContext);
```

`components/admin/shell/AdminLanguageToggle.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAdminLocale } from "@/actions/adminLocale";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";
import type { Locale } from "@/lib/i18n";

const OPTIONS: Locale[] = ["es", "en"];

const AdminLanguageToggle = () => {
  const ui = useAdminLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const choose = (next: Locale) =>
    startTransition(async () => {
      await setAdminLocale(next);
      router.refresh();
    });

  return (
    <div role="group" aria-label={tr(ui, "Idioma del panel")} className="flex rounded-lg bg-white/10 p-0.5 text-xs font-semibold">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={ui === option}
          disabled={pending}
          onClick={() => choose(option)}
          className={`px-2 py-1 rounded-md ${ui === option ? "bg-white text-shop_dark_green" : "text-white/70 hover:text-white"}`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default AdminLanguageToggle;
```

In `components/admin/shell/Sidebar.tsx`, import it (`import AdminLanguageToggle from "./AdminLanguageToggle";`) and put it in the footer, between `<UserButton … />` and the `Ver tienda` link:

```tsx
        <UserButton userProfileProps={{ apiKeysProps: { hide: true } }} />
        <AdminLanguageToggle />
        <a
```

(The same `Sidebar` is the mobile menu, so the selector shows there too. Translating the rest of the sidebar is Task 3.)

- [ ] **Step 3: Layout: Clerk, provider and tab title**

Replace `app/(admin)/admin/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ClientClerkProvider from "@/components/ClientClerkProvider";
import { AdminLocaleProvider } from "@/components/admin/AdminLocaleProvider";
import AdminShell from "@/components/admin/shell/AdminShell";
import { getAdminLocale } from "@/lib/adminLocale";
import { tr } from "@/lib/adminText";
import { getActor } from "@/lib/roles";
import { adminSections } from "@/lib/permissions";

// The panel carries our brand (tab title and icon); the store keeps each client's.
export async function generateMetadata(): Promise<Metadata> {
  const ui = await getAdminLocale();
  return {
    title: { absolute: `${tr(ui, "Administración")} | Ecom by Yeison` },
    icons: { icon: [{ url: "/ecom-by-yeison.svg", type: "image/svg+xml" }] },
    robots: { index: false },
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  // ponytail: always returns to /admin after sign-in, not to the deep link.
  if (!actor) redirect("/sign-in?redirect_url=/admin");
  const sections = adminSections(actor.role);
  if (sections.length === 0) notFound();
  const [nonce, ui] = await Promise.all([headers().then((h) => h.get("x-nonce") ?? undefined), getAdminLocale()]);

  return (
    <ClientClerkProvider nonce={nonce} locale={ui}>
      <AdminLocaleProvider locale={ui}>
        <AdminShell sections={sections}>{children}</AdminShell>
      </AdminLocaleProvider>
    </ClientClerkProvider>
  );
}
```

- [ ] **Step 4: Server errors in the panel language**

Replace `lib/actionResult.ts` with:

```ts
import { NOT_AUTHORIZED } from "./roles";
import { tr, type AdminText, type TextVars } from "./adminText";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errors?: Record<string, string> };

// A message meant for the store owner (what to fix), written in Spanish; run() answers it in the
// panel's language. raw() carries a message already built in that language (e.g. by a validator).
// Any other error becomes the generic message, so internals never reach the browser.
export class ActionError extends Error {
  readonly vars?: TextVars;
  readonly translated: boolean;
  constructor(text: AdminText, vars?: TextVars, translated = false) {
    super(text);
    this.vars = vars;
    this.translated = translated;
  }
  static raw(message: string): ActionError {
    return new ActionError(message as AdminText, undefined, true);
  }
}

// Server action errors are redacted in production, so return a result object instead of throwing.
export async function run<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    // Loaded here, not at the top: client files import this module's types, never next/headers.
    const ui = await import("./adminLocale").then((m) => m.getAdminLocale()).catch(() => "es" as const);
    if (error instanceof ActionError) {
      return { ok: false, error: error.translated ? error.message : tr(ui, error.message as AdminText, error.vars) };
    }
    console.log("Admin action failed", error);
    const denied = error instanceof Error && error.message === NOT_AUTHORIZED;
    return { ok: false, error: tr(ui, denied ? "No tienes permiso para esta acción" : "No se pudo completar la acción") };
  }
}
```

- [ ] **Step 5: Run the typecheck to see the call sites that break**

Run the typecheck.
Expected: errors only at `new ActionError(...)` calls whose argument is not an `AdminText`: in `actions/newsletterAdmin.ts` (the literal texts, `CAMPAIGN_NOT_FOUND`, `SMTP_UNREADABLE`, `OTHER_TAB`, `SEND_FAILED`, `problems[0]`, `smtpErrorMessage(...)`) and `lib/campaignSend.ts` (`OTHER_TAB`).

- [ ] **Step 6: Make those call sites typed (behavior unchanged)**

Add to `lib/adminText/newsletter.ts` (inside the map):

```ts
  "Tu cuenta no tiene un correo para recibir la prueba.": "Your account has no email to receive the test.",
  "Suscriptor no encontrado": "Subscriber not found",
  "Campaña no encontrada": "Campaign not found",
  "Esta campaña ya no se puede editar; duplícala para cambiarla": "This campaign can no longer be edited; duplicate it to change it",
  "Pausa el envío antes de borrar la campaña": "Pause the sending before deleting the campaign",
  "No se pudo leer la contraseña guardada. Vuelve a escribirla en Ajustes → Correo.": "The saved password could not be read. Type it again in Settings → Email.",
  "Configura el correo de salida en Ajustes → Correo.": "Set up outgoing email in Settings → Email.",
  "Esta campaña ya se envió": "This campaign was already sent",
  "Otra pestaña está enviando esta campaña": "Another tab is sending this campaign",
  "No se pudo continuar el envío": "Sending could not continue",
```

Then:
- `lib/newsletter.ts`: add `import type { AdminText } from "./adminText/index.ts";` and type the constant: `export const SMTP_UNREADABLE: AdminText = "No se pudo leer la contraseña guardada. Vuelve a escribirla en Ajustes → Correo.";`
- `lib/campaignSend.ts`: `import type { AdminText } from "@/lib/adminText";` and `export const OTHER_TAB: AdminText = "…";`, `export const SEND_FAILED: AdminText = "…";` (same texts as today).
- `actions/newsletterAdmin.ts`: `const CAMPAIGN_NOT_FOUND: AdminText = "Campaña no encontrada";` (import the type from `@/lib/adminText`); `throw new ActionError(problems[0])` → `throw ActionError.raw(problems[0])`; `throw new ActionError(smtpErrorMessage(error as SmtpErrorInfo))` → `throw ActionError.raw(smtpErrorMessage(error as SmtpErrorInfo))`. Literal texts stay as they are (they are now `AdminText`). Tasks 8 and 10 make `problems[0]` and `smtpErrorMessage` speak the panel language.

- [ ] **Step 7: Verify**

Run the typecheck, `npm run -s check:permissions`, lint on the touched files and the build.
Expected: typecheck no output; tests `ok`; lint no new findings; build exit 0.

- [ ] **Step 8: Browser check (no writes)**

Start the dev server on 3000. Open `http://localhost:3000/admin` in a new tab (the browser is already signed in; never sign in).
1. Note the starting language (the store's main language when there is no cookie).
2. Click `EN` (JS click is fine). After the refresh: `document.documentElement.lang === "en"`, `document.title === "Admin | Ecom by Yeison"`, the group's `aria-label` is `Panel language`, the `EN` button has `aria-pressed="true"`.
3. Click `ES`. After the refresh: `lang === "es"`, title `Administración | Ecom by Yeison`.
4. Open `http://localhost:3000/` in the same tab: the store still shows its own language (the admin cookie does not change it).
Leave the panel in `ES`. Stop the dev server.

- [ ] **Step 9: Stage**

```bash
git add lib/adminLocale.ts actions/adminLocale.ts components/admin/AdminLocaleProvider.tsx components/admin/shell/AdminLanguageToggle.tsx components/admin/shell/Sidebar.tsx "app/(admin)/admin/layout.tsx" lib/actionResult.ts actions/newsletterAdmin.ts lib/newsletter.ts lib/campaignSend.ts lib/adminText/newsletter.ts
```

---

### Task 3: Shell, Inicio and shared editor pieces

**Files:**
- Modify: `components/admin/shell/AdminShell.tsx`, `components/admin/shell/Sidebar.tsx`, `components/admin/shell/nav.ts`, `components/admin/shell/PageHeader.tsx` (only if it has fixed text), `components/admin/dashboard/RecentOrders.tsx`, `components/admin/dashboard/StatCard.tsx`, `app/(admin)/admin/page.tsx`, `components/admin/EditorLocale.tsx`, `components/admin/brand/fields.tsx`, `components/admin/brand/ImageField.tsx`, `lib/localize.ts` (`LANGUAGE_NAMES` typing only)
- Modify: `lib/adminText/shell.ts`, `lib/adminText/common.ts`

**Interfaces:**
- Consumes: Task 1 `tr`, `AdminText`, `dateLocale`; Task 2 `useAdminLocale`, `getAdminLocale`.
- Produces: `NavItem.label: AdminText` and group `title: AdminText` in `nav.ts`; `LANGUAGE_NAMES` typed `Record<Locale, AdminText>` (values unchanged: `Español`, `Inglés`); shared editor pieces (`TextField`, `SectionCard`, `SavingNote`, `ImageField`, `EditorLocale`) render their own fixed texts in the panel language. Callers still pass their own `label` props (translated in their tasks).

- [ ] **Step 1: See what is untranslated here**

Run: `npm run -s check:admin-text -- components/admin/shell components/admin/dashboard "app/(admin)/admin/page.tsx" components/admin/EditorLocale.tsx components/admin/brand/fields.tsx components/admin/brand/ImageField.tsx`
Expected: exit 1 with findings (for example `"Abrir menú"`, `"Ver tienda"`, `"Ventas del mes"`).

- [ ] **Step 2: Translate**

Apply the translation rules to every file in **Files**:
- `nav.ts`: type `label` and `title` as `AdminText` and show them in `Sidebar.tsx` with `tr(ui, label)` / `tr(ui, group.title)`. The `<nav aria-label="Administración">` uses `tr(ui, "Administración")`. `Ver tienda` → `View store`.
- `app/(admin)/admin/page.tsx` is a server component: `const ui = await getAdminLocale();`. Dates use `dateLocale(ui)`.
- `EditorLocale.tsx`: the buttons show `tr(ui, LANGUAGE_NAMES[locale])` (here `locale` is the content language). The missing badge becomes two whole texts chosen by the content language: `tr(ui, locale === "en" ? "Falta inglés" : "Falta español")`. In `lib/localize.ts` type `LANGUAGE_NAMES` as `Record<Locale, AdminText>` with `import type { AdminText } from "./adminText/index.ts";` (values stay `Español` / `Inglés`).
- `fields.tsx` / `ImageField.tsx`: only their own fixed texts (button texts, `Guardando borrador…`, image errors shown by the browser). `IMAGE_ERROR` is translated in Task 7.
- Put shell and Inicio texts in `lib/adminText/shell.ts`; texts reused across areas (`Guardar`, `Cancelar`, `Borrar`, `Guardando borrador…`, `Español`, `Inglés`, `Falta español`, `Falta inglés`) in `lib/adminText/common.ts`, with the exact English from Global Constraints.

- [ ] **Step 3: Verify**

Run: the Step 1 command → `check-admin-text: 0 sin traducir`. Then the typecheck, `npm run -s check:permissions`, lint on the touched files, and the build.
Expected: all clean.

- [ ] **Step 4: Stage**

```bash
git add components/admin/shell components/admin/dashboard "app/(admin)/admin/page.tsx" components/admin/EditorLocale.tsx components/admin/brand/fields.tsx components/admin/brand/ImageField.tsx lib/localize.ts lib/adminText/shell.ts lib/adminText/common.ts
```

---

### Task 4: Catalog (Productos, Categorías, Marcas)

**Files:**
- Modify: `components/admin/products/ProductsList.tsx`, `components/admin/products/ProductEditor.tsx`, `components/admin/products/ProductImages.tsx`, `components/admin/catalog/TaxonomyManager.tsx`, `app/(admin)/admin/productos/page.tsx`, `app/(admin)/admin/productos/[id]/page.tsx`, `app/(admin)/admin/categorias/page.tsx`, `app/(admin)/admin/marcas/page.tsx`
- Modify: `lib/catalog.ts` (`validateProduct`, `validateCategory`, `validateBrand` and their helpers, `PRODUCT_STATE_LABELS`), `actions/catalog.ts` (the `fail(...)` texts and validator calls)
- Modify: `lib/adminText/catalog.ts`
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: Task 1 `tr`, `AdminText`, `dateLocale`; Task 2 `useAdminLocale`, `getAdminLocale`, `ActionError`; Task 3 shared editor pieces.
- Produces: `validateProduct(input, primary = "es", ui: Locale = "es")`, `validateCategory(input, primary = "es", ui: Locale = "es")`, `validateBrand(input, primary = "es", ui: Locale = "es")`.

- [ ] **Step 1: Write the failing test**

Add to `scripts/check-permissions.mjs` before the final `console.log`:

```js
// Catalog validators in the panel language (lib/catalog.ts); no ui = today's Spanish
{
  const c = await import("../lib/catalog.ts");
  const lz = await import("../lib/localize.ts");
  assert.deepEqual(c.validateProduct({}).errors, { name: "Campo obligatorio (español)", slug: "Campo obligatorio", price: "Campo obligatorio" });
  assert.deepEqual(c.validateProduct({}, "es", "en").errors, { name: "Required (Spanish)", slug: "Required", price: "Required" });
  assert.equal(c.validateCategory({}, "en", "en").errors.titleEn, "Required (English)");
  assert.equal(c.validateBrand({}).errors.title, "Campo obligatorio (español)");
  assert.equal(c.validateBrand({ title: "x".repeat(200), slug: "x" }, "es", "en").errors.title, "Up to 80 characters");
  // Pins how the "English missing" badge works: lacksLanguage looks for the Spanish message, so
  // the editors' calls inside lacksLanguage(...) must keep validating without ui.
  assert.equal(lz.lacksLanguage(c.validateProduct({ name: "Mesa", slug: "mesa", price: 10 }, "en"), "en"), true);
}
```

- [ ] **Step 2: Run tests and the text check to verify they fail**

Run: `npm run -s check:permissions` → Expected: FAIL (`Required (Spanish)` expected, Spanish received).
Run: `npm run -s check:admin-text -- components/admin/products components/admin/catalog "app/(admin)/admin/productos" "app/(admin)/admin/categorias" "app/(admin)/admin/marcas"` → Expected: exit 1 with findings.

- [ ] **Step 3: Translate**

- `lib/catalog.ts`: add `import { tr } from "./adminText/index.ts";`. Replace the `REQUIRED`, `requiredIn` and `tooLong` copies with functions of `ui`:
  ```ts
  const required = (ui: Locale) => tr(ui, "Campo obligatorio");
  const requiredIn = (locale: Locale, ui: Locale) => tr(ui, locale === "en" ? "Campo obligatorio (inglés)" : "Campo obligatorio (español)");
  const tooLong = (max: number, ui: Locale) => tr(ui, "Máximo {max} caracteres", { max });
  ```
  Thread `ui` from each `validate*` (new last parameter `ui: Locale = "es"`) through the helpers that build messages. Every other message in these validators goes through `tr(ui, …)` with an entry in `lib/adminText/catalog.ts`. Type `PRODUCT_STATE_LABELS` values as `AdminText`.
- Components: apply the translation rules. Editors validate in the panel language (`(value) => validateProduct(value, primary, ui)`), except the calls inside `lacksLanguage(...)`, which stay exactly as they are: `ProductEditor.tsx` `lacksLanguage(validateProduct(form, other), other)` and `TaxonomyManager.tsx` `lacksLanguage(validate(editing, other), other)` (the `validate` prop is `validateCategory` / `validateBrand`; where the manager validates for display, pass `ui` as the third argument).
- `actions/catalog.ts`: `const ui = await getAdminLocale();` where validators or `fail(...)` run; pass `ui` to the validators; `fail("…")` → `fail(tr(ui, "…"))`. `fail(INVALID_FORM)` → `fail(tr(ui, "Revisa los campos marcados"))`.

- [ ] **Step 4: Verify**

Run both Step 2 commands → tests `ok`, text check `0 sin traducir`. Then the typecheck, lint on the touched files, and the build.
Expected: all clean.

- [ ] **Step 5: Stage**

```bash
git add components/admin/products components/admin/catalog "app/(admin)/admin/productos" "app/(admin)/admin/categorias" "app/(admin)/admin/marcas" lib/catalog.ts actions/catalog.ts lib/adminText/catalog.ts scripts/check-permissions.mjs
```

---

### Task 5: Pedidos and Usuarios

**Files:**
- Modify: `components/admin/orders/OrdersManager.tsx`, `components/admin/orders/OrderDrawer.tsx`, `components/admin/orders/types.ts` (only if it has fixed text), `components/admin/dashboard/RecentOrders.tsx` (only its `statusLabel` call), `app/(admin)/admin/pedidos/page.tsx`, `lib/orderStatus.ts` (`ORDER_STATUS_LABELS` typing, `statusLabel`), `components/admin/UsersTab.tsx`, `app/(admin)/admin/usuarios/page.tsx`, `lib/permissions.ts` (`ROLE_LABELS` typing only), `actions/admin.ts` (texts the panel shows)
- Modify: `lib/adminText/orders.ts`, `lib/adminText/users.ts`
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: Task 1 `tr`, `AdminText`, `dateLocale`; Task 2 `useAdminLocale`, `getAdminLocale`.
- Produces: `ORDER_STATUS_LABELS: Record<OrderStatus, AdminText>` and `ROLE_LABELS: Record<Role, AdminText>` (values unchanged); `statusLabel(value?: string, ui: Locale = "es"): string` (unknown statuses are shown as they come).

- [ ] **Step 1: Write the failing test**

```js
// Order status labels in the panel language (lib/orderStatus.ts)
{
  const os = await import("../lib/orderStatus.ts");
  assert.equal(os.statusLabel("paid"), "Pagado");
  assert.equal(os.statusLabel("paid", "en"), "Paid");
  assert.equal(os.statusLabel("out_for_delivery", "en"), "Out for delivery");
  assert.equal(os.statusLabel("legacy_status", "en"), "legacy_status");
  assert.equal(os.statusLabel(undefined, "en"), "—");
}
```

(`Pendiente` → `Pending`, `Pagado` → `Paid`, `En proceso` → `Processing`, `Enviado` → `Shipped`, `En reparto` → `Out for delivery`, `Entregado` → `Delivered`, `Cancelado` → `Cancelled`.)

- [ ] **Step 2: Run the test and the text check to verify they fail**

Run: `npm run -s check:permissions` → Expected: FAIL (`Paid` expected, `Pagado` received).
Run: `npm run -s check:admin-text -- components/admin/orders "app/(admin)/admin/pedidos" components/admin/UsersTab.tsx "app/(admin)/admin/usuarios"` → Expected: exit 1 with findings.

- [ ] **Step 3: Translate**

Apply the translation rules. `lib/orderStatus.ts` (a pure module) gets `import { tr, type AdminText } from "./adminText/index.ts";`, `ORDER_STATUS_LABELS: Record<OrderStatus, AdminText>`, and `statusLabel(value, ui = "es")` returns `tr(ui, ORDER_STATUS_LABELS[value])` for known statuses. Its callers (`OrderDrawer`, `OrdersManager`, `RecentOrders`) pass `ui`; the status `<option>`s show `tr(ui, ORDER_STATUS_LABELS[s])`. Update the file's top comment ("No imports") to say it imports only `lib/adminText`. `ROLE_LABELS` (`lib/permissions.ts`) gets `AdminText` values via `import type { AdminText } from "./adminText/index.ts";` and is shown with `tr(ui, …)`. The order date in `OrderDrawer` and `OrdersManager` uses `dateLocale(ui)` instead of `"es"`. Texts go in `lib/adminText/orders.ts` and `lib/adminText/users.ts`.

- [ ] **Step 4: Verify**

Run both Step 2 commands → tests `ok`, text check `0 sin traducir`. Then the typecheck, lint on the touched files, and the build.
Expected: all clean.

- [ ] **Step 5: Stage**

```bash
git add components/admin/orders components/admin/dashboard/RecentOrders.tsx "app/(admin)/admin/pedidos" lib/orderStatus.ts components/admin/UsersTab.tsx "app/(admin)/admin/usuarios" lib/permissions.ts actions/admin.ts lib/adminText/orders.ts lib/adminText/users.ts scripts/check-permissions.mjs
```

---

### Task 6: Apariencia — theme, home sections, styles and preview

**Files:**
- Modify: `components/admin/appearance/AppearanceEditor.tsx`, `components/admin/appearance/PreviewFrame.tsx`, `components/admin/appearance/SectionForm.tsx`, `components/admin/appearance/SectionList.tsx`, `components/admin/appearance/StylesPanel.tsx`, `components/admin/appearance/ThemePicker.tsx`, `app/(admin)/admin/apariencia/page.tsx`
- Modify: `lib/homeSections.ts` (`validateHomeSections`, its helpers, `SECTION_LABELS` and any other admin labels), `lib/styles.ts` (`validateStyles` and its option labels), the theme name list (wherever `ThemePicker` reads it), `actions/appearance.ts` (validator calls and texts)
- Modify: `lib/adminText/appearance.ts`
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: Task 1 `tr`, `AdminText`; Task 2 `useAdminLocale`, `getAdminLocale`; Task 3 shared editor pieces.
- Produces: `validateHomeSections(input, primary = "es", ui: Locale = "es")`, `validateStyles(input, ui: Locale = "es")`; `SECTION_LABELS: Record<SectionKind, AdminText>`. `lib/homeSections.ts` has its own copies of `REQUIRED`, `requiredIn`, `tooLong` and `int` (`Elige un número entre …`, already in the validation map) plus `Máximo {max} secciones`: all become functions of `ui`.

- [ ] **Step 1: Write the failing test**

```js
// Apariencia validators in the panel language (lib/homeSections.ts, lib/styles.ts)
{
  const h = await import("../lib/homeSections.ts");
  const s = await import("../lib/styles.ts");
  assert.equal(h.validateHomeSections([]).errors.sections, "Faltan secciones: Banner principal, Productos por tipo, Categorías, Marcas, Blog");
  assert.equal(h.validateHomeSections([], "es", "en").errors.sections, "Missing sections: Main banner, Products by type, Categories, Brands, Blog");
  assert.equal(h.validateHomeSections({}, "es", "en").errors.sections, "Invalid section list");
  assert.equal(s.validateStyles({ buttons: "x" }).errors.buttons, "Opción inválida");
  assert.equal(s.validateStyles({ buttons: "x" }, "en").errors.buttons, "Invalid option");
}
```

- [ ] **Step 2: Run tests and the text check to verify they fail**

Run: `npm run -s check:permissions` → Expected: FAIL (`Missing sections: …` expected).
Run: `npm run -s check:admin-text -- components/admin/appearance "app/(admin)/admin/apariencia"` → Expected: exit 1 with findings.

- [ ] **Step 3: Translate**

- `lib/homeSections.ts` and `lib/styles.ts`: `import { tr } from "./adminText/index.ts";`, helpers of `ui` as in Task 4 Step 3, new last parameter `ui: Locale = "es"`. The missing-sections message is one template: `tr(ui, "Faltan secciones: {list}", { list: missing.map((k) => tr(ui, SECTION_LABELS[k])).join(", ") })`.
- Components and `actions/appearance.ts`: translation rules; validators get `ui` (except inside `lacksLanguage`).
- Texts in `lib/adminText/appearance.ts`, with the exact English from Global Constraints for the section labels and messages above.

- [ ] **Step 4: Verify**

Run both Step 2 commands → `ok` and `0 sin traducir`. Then the typecheck, lint on the touched files, and the build.

- [ ] **Step 5: Stage**

```bash
git add components/admin/appearance "app/(admin)/admin/apariencia" lib/homeSections.ts lib/styles.ts actions/appearance.ts lib/adminText/appearance.ts scripts/check-permissions.mjs
```

(Also add the theme-name file if you changed it, and name it in the report.)

---

### Task 7: Apariencia — store data, and Páginas

**Files:**
- Modify: `components/admin/brand/IdentitySection.tsx`, `components/admin/brand/BannerSection.tsx`, `components/admin/brand/ContactSection.tsx`, `components/admin/brand/SocialSection.tsx`, `components/admin/pages/PagesTab.tsx`, `components/admin/pages/BlockEditor.tsx`, `app/(admin)/admin/paginas/page.tsx`
- Modify: `lib/validation.ts` (`validateIdentity`, `validateBanner`, `validateContact`, `validateSocial`, `validatePage`, `validateImageFile`, their helpers, `PAGE_LABELS`, `CONTENT_ICONS`; `INVALID_FORM` and `IMAGE_ERROR` stay as Spanish constants typed `AdminText`), `actions/brand.ts`, `actions/appearance.ts` (only the calls of these validators)
- Modify: `lib/adminText/appearance.ts`, `lib/adminText/validation.ts`
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: Task 1 `tr`, `AdminText`; Task 2 `useAdminLocale`, `getAdminLocale`; Task 3 shared editor pieces.
- Produces: `validateIdentity(input, ui = "es")`, `validateBanner(input, primary = "es", ui = "es")`, `validateContact(input, ui = "es")`, `validateSocial(input, ui = "es")`, `validatePage(input, primary = "es", ui = "es")`, `validateImageFile(file, allowed = BRAND_IMAGE_TYPES, ui = "es")` (all `ui: Locale`; `allowed` is the existing second parameter); `INVALID_FORM: AdminText`, `IMAGE_ERROR: AdminText`.

- [ ] **Step 1: Write the failing test**

```js
// Store data and page validators in the panel language (lib/validation.ts)
{
  const v = await import("../lib/validation.ts");
  assert.deepEqual(v.validateIdentity({}).errors, { logoType: "Elige texto o imagen", storeName: "Campo obligatorio" });
  assert.deepEqual(v.validateIdentity({}, "en").errors, { logoType: "Choose text or image", storeName: "Required" });
  assert.equal(v.validateBanner({ title: "x".repeat(400) }, "es", "en").errors.title, "Up to 60 characters");
  assert.equal(v.validateContact({ email: "nope" }, "en").errors.email, "Invalid email");
  assert.equal(v.validateSocial({ facebook: "x" }, "en").errors.facebook, "Must be an https:// link");
  assert.equal(v.validateImageFile({ type: "text/plain", size: 10 }), "Solo JPG, PNG, WEBP o SVG de hasta 4 MB");
  assert.equal(v.validateImageFile({ type: "text/plain", size: 10 }, undefined, "en"), "Only JPG, PNG, WEBP or SVG up to 4 MB");
}
```

- [ ] **Step 2: Run tests and the text check to verify they fail**

Run: `npm run -s check:permissions` → Expected: FAIL (`Choose text or image` expected).
Run: `npm run -s check:admin-text -- components/admin/brand components/admin/pages "app/(admin)/admin/paginas"` → Expected: exit 1 with findings (`fields.tsx` and `ImageField.tsx` are already clean from Task 3).

- [ ] **Step 3: Translate**

- `lib/validation.ts`: `import { tr } from "./adminText/index.ts";` and `import type { AdminText } from "./adminText/index.ts";`. Helpers of `ui` as in Task 4 Step 3 (`required`, `requiredIn`, `tooLong`, plus `hrefError = (ui: Locale) => tr(ui, "Usa una ruta que empiece por / o un enlace https://")`). New last parameter `ui: Locale = "es"` on the validators in **Interfaces**. `validateSubscription` (the store's footer) does not change. `INVALID_FORM` and `IMAGE_ERROR` become `export const INVALID_FORM: AdminText = "Revisa los campos marcados";` and `export const IMAGE_ERROR: AdminText = "Solo JPG, PNG, WEBP o SVG de hasta 4 MB";` so callers can pass them to `tr`. `PAGE_LABELS` and `CONTENT_ICONS` values are typed `AdminText` and shown with `tr`.
- `actions/brand.ts` and the validator calls in `actions/appearance.ts`: `const ui = await getAdminLocale();`, pass `ui`; `{ ok: false, error: IMAGE_ERROR }` → `{ ok: false, error: tr(ui, IMAGE_ERROR) }`; `INVALID_FORM` returns → `tr(ui, INVALID_FORM)` (also the ones in `actions/appearance.ts`, `actions/catalog.ts` and `actions/newsletterAdmin.ts` that are not done yet).
- Components: translation rules; validators get `ui` (except inside `lacksLanguage`). `SOCIAL_LABELS` (brand names) are shown as they are.
- Messages from these validators go in `lib/adminText/validation.ts`; screen texts in `lib/adminText/appearance.ts`.

- [ ] **Step 4: Verify**

Run both Step 2 commands → `ok` and `0 sin traducir`. Then the typecheck, lint on the touched files, and the build.

- [ ] **Step 5: Stage**

```bash
git add components/admin/brand components/admin/pages "app/(admin)/admin/paginas" lib/validation.ts actions/brand.ts actions/appearance.ts actions/catalog.ts actions/newsletterAdmin.ts lib/adminText/appearance.ts lib/adminText/validation.ts scripts/check-permissions.mjs
```

---

### Task 8: Ajustes (moneda, idiomas de la tienda, correo SMTP)

**Files:**
- Modify: `components/admin/CurrencySection.tsx`, `components/admin/LanguageSection.tsx`, `components/admin/newsletter/SmtpSection.tsx`, `app/(admin)/admin/ajustes/page.tsx`
- Modify: `lib/newsletter.ts` (`validateSmtpSettings`, `int`, `smtpErrorMessage`, `SMTP_SECURITY` labels if shown), `lib/localize.ts` (`LANGUAGE_CHOICES` typing only), `actions/newsletterAdmin.ts` (`saveSmtpSettings`, `testSmtp`, `deleteSmtpSettings` texts: `KEY_MISSING`, test steps and messages), `actions/admin.ts` (currency and languages texts, if any reach the panel), `constants/currencies.ts` (only labels the panel shows)
- Modify: `lib/adminText/settings.ts`
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: Task 1 `tr`, `AdminText`; Task 2 `useAdminLocale`, `getAdminLocale`, `ActionError.raw`.
- Produces: `validateSmtpSettings(input, { hasStoredPassword }, ui: Locale = "es")`; `smtpErrorMessage(info: SmtpErrorInfo, ui: Locale = "es")`; `LANGUAGE_CHOICES: Record<LanguageChoice, AdminText>`.

- [ ] **Step 1: Write the failing test**

```js
// SMTP settings validator in the panel language (lib/newsletter.ts)
{
  const nl = await import("../lib/newsletter.ts");
  assert.deepEqual(nl.validateSmtpSettings({}, { hasStoredPassword: false }).errors, { host: "Campo obligatorio", fromEmail: "Campo obligatorio" });
  assert.deepEqual(nl.validateSmtpSettings({}, { hasStoredPassword: false }, "en").errors, { host: "Required", fromEmail: "Required" });
  assert.equal(nl.validateSmtpSettings({ host: "smtp.x.co", fromEmail: "a@x.co", port: "1e3" }, { hasStoredPassword: false }, "en").errors.port, "Choose a number between 1 and 65535");
}
```

(`Elige un número entre {min} y {max}` is already in the validation map from Task 1.)

- [ ] **Step 2: Run tests and the text check to verify they fail**

Run: `npm run -s check:permissions` → Expected: FAIL.
Run: `npm run -s check:admin-text -- components/admin/CurrencySection.tsx components/admin/LanguageSection.tsx components/admin/newsletter/SmtpSection.tsx "app/(admin)/admin/ajustes"` → Expected: exit 1 with findings.

- [ ] **Step 3: Translate**

- `lib/newsletter.ts`: `import { tr } from "./adminText/index.ts";`; `int(errors, key, value, min, max, fallback, ui)` builds `tr(ui, "Elige un número entre {min} y {max}", { min, max })`; `validateSmtpSettings` and `smtpErrorMessage` take `ui` last. Shared helpers in this file (`text`, `REQUIRED`, `tooLong`) become functions of `ui` like in Task 4 Step 3; the campaign functions that use them keep passing nothing until Task 10, so their Spanish stays the same.
- `actions/newsletterAdmin.ts` (SMTP part only): `const ui = await getAdminLocale();` in `saveSmtpSettings` and `testSmtp`; pass `ui` to `validateSmtpSettings`; `KEY_MISSING`, the test messages and steps (`Conectado al servidor`, `Sesión iniciada`, …) go through `tr(ui, …)`; `throw ActionError.raw(smtpErrorMessage(error as SmtpErrorInfo, ui))`.
- `LanguageSection.tsx`: `LANGUAGE_CHOICES` values typed `AdminText` (`lib/localize.ts`) and shown with `tr`.
- Components: translation rules. Texts in `lib/adminText/settings.ts`.

- [ ] **Step 4: Verify**

Run both Step 2 commands → `ok` and `0 sin traducir`. Then the typecheck, lint on the touched files, and the build.

- [ ] **Step 5: Stage**

Stage every file you touched in this task, plus `lib/adminText/settings.ts` and `scripts/check-permissions.mjs`.

- [ ] **Step 6: Browser check: an error answered by the server (no writes)**

Dev server on 3000. Open `/admin/ajustes`, switch the panel to `EN`. In the email (SMTP) form, empty the server field (`host`) and press the save button. The server rejects it before writing.
Expected: the field shows `Required` and the toast says `Check the marked fields`. Put the field back as it was (if it was empty, leave it empty). Switch back to `ES`. Stop the dev server.

---

### Task 9: Boletín — suscriptores

**Files:**
- Modify: `components/admin/newsletter/SubscribersTab.tsx`, `components/admin/newsletter/SubscriberTools.tsx`, `components/admin/newsletter/DeleteSubscriberButton.tsx`, `app/(admin)/admin/boletin/page.tsx`
- Modify: `lib/newsletter.ts` (`parseEmailCsv` messages, `STATUS_LABELS`, `SOURCE_LABELS`, `subscribersCsv`), `actions/newsletterAdmin.ts` (subscriber actions: `addSubscriber`, `previewImport`, `importSubscribers`, `deleteSubscriber`, `exportSubscribers`; `PERMISSION_ONE`, `PERMISSION_MANY`, `BAD_LIST`)
- Modify: `lib/adminText/newsletter.ts`
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: Task 1 `tr`, `AdminText`, `dateLocale`; Task 2 `useAdminLocale`, `getAdminLocale`.
- Produces: `parseEmailCsv(text, ui: Locale = "es")`; `subscribersCsv(rows, ui: Locale = "es")` (header and labels in `ui`; the column `email` keeps that name in both languages so the file can be imported back); `STATUS_LABELS: Record<SubscriberStatus, AdminText>`, `SOURCE_LABELS: Record<SubscriberSource, AdminText>`.

- [ ] **Step 1: Write the failing test**

```js
// Subscriber texts in the panel language (lib/newsletter.ts)
{
  const nl = await import("../lib/newsletter.ts");
  const rows = [{ email: "ana@example.com", subscribedAt: "2026-10-07T10:00:00Z", source: "import", status: "unsubscribed" }];
  assert.ok(nl.subscribersCsv(rows).startsWith("﻿email,fecha,origen,estado\r\n"));
  assert.ok(nl.subscribersCsv(rows, "en").startsWith("﻿email,date,source,status\r\n"));
  assert.ok(nl.subscribersCsv(rows, "en").includes("ana@example.com,2026-10-07,Imported,Unsubscribed\r\n"));
  assert.deepEqual(nl.parseEmailCsv("nombre\nana"), { ok: false, error: "No encontramos una columna de correos" });
  assert.deepEqual(nl.parseEmailCsv("nombre\nana", "en"), { ok: false, error: "No email column found" });
}
```

(`Importado` → `Imported`, `Dado de baja` → `Unsubscribed`, `Activo` → `Active`, `Pie de página` → `Footer`, `Manual` → `Manual`; header `fecha,origen,estado` → `date,source,status`; `No encontramos una columna de correos` → `No email column found`.)

- [ ] **Step 2: Run tests and the text check to verify they fail**

Run: `npm run -s check:permissions` → Expected: FAIL.
Run: `npm run -s check:admin-text -- components/admin/newsletter/SubscribersTab.tsx components/admin/newsletter/SubscriberTools.tsx components/admin/newsletter/DeleteSubscriberButton.tsx "app/(admin)/admin/boletin/page.tsx"` → Expected: exit 1 with findings.

- [ ] **Step 3: Translate**

Translation rules. `SubscribersTab` is a server component (`getAdminLocale()`); dates use `dateLocale(ui)`. `FILTERS` labels (`Todos`, `Activos`, `Dados de baja`) become `AdminText` and are shown with `tr`. The import summary toast and the 1 MB message go through `tr` with variables. `exportSubscribers` passes `ui` to `subscribersCsv`; its header row is one map entry (`"email,fecha,origen,estado": "email,date,source,status"`) and the cells use `tr(ui, SOURCE_LABELS[…])` / `tr(ui, STATUS_LABELS[…])`. Subscriber actions pass `ui` and return `tr(ui, …)` texts. Texts in `lib/adminText/newsletter.ts`.

- [ ] **Step 4: Verify**

Run both Step 2 commands → `ok` and `0 sin traducir`. Then the typecheck, lint on the touched files, and the build.

- [ ] **Step 5: Stage**

Stage every file you touched in this task, plus `lib/adminText/newsletter.ts` and `scripts/check-permissions.mjs`.

---

### Task 10: Boletín — campañas y envío

**Files:**
- Modify: `components/admin/newsletter/CampaignsTab.tsx`, `components/admin/newsletter/NewCampaignButton.tsx`, `components/admin/newsletter/CampaignEditor.tsx`, `components/admin/newsletter/ProductPicker.tsx`, `components/admin/newsletter/CampaignSendPanel.tsx`, `app/(admin)/admin/boletin/[id]/page.tsx`
- Modify: `lib/newsletter.ts` (`validateCampaign`, `campaignSendProblems`, `CAMPAIGN_STATUS_LABELS`, other campaign texts), `lib/campaignSend.ts` (`runBatch(campaign, ui)`, `pauseWith` messages, `SEND_FAILED`/`OTHER_TAB` already typed), `actions/newsletterAdmin.ts` (campaign actions: `sendCampaignTest`, `createCampaign`, `saveCampaign`, `duplicateCampaign`, `deleteCampaign`, `startCampaign`, `sendCampaignBatch`, `pauseCampaign`)
- Modify: `lib/adminText/newsletter.ts`
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: Task 1 `tr`, `AdminText`, `dateLocale`; Task 2 `useAdminLocale`, `getAdminLocale`, `ActionError`, `ActionError.raw`; Task 8 shared `lib/newsletter.ts` helpers of `ui`.
- Produces: `validateCampaign(input, ui: Locale = "es")`, `campaignSendProblems(content, ready, ui: Locale = "es")`, `runBatch(campaign: CampaignDoc, ui: Locale): Promise<CampaignProgress>`; `CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, AdminText>`. A pause message (`pauseMessage`) is saved in the `ui` of the person sending.

- [ ] **Step 1: Write the failing test**

```js
// Campaign texts in the panel language (lib/newsletter.ts)
{
  const nl = await import("../lib/newsletter.ts");
  assert.equal(nl.validateCampaign({ subject: "x".repeat(400) }).errors.subject, "Máximo 150 caracteres");
  assert.equal(nl.validateCampaign({ subject: "x".repeat(400) }, "en").errors.subject, "Up to 150 characters");
  const content = { ...nl.EMPTY_CAMPAIGN, subject: "Hola", title: "Hola" };
  const ready = { smtpReady: true, keyReady: true, baseUrl: "https://example.com", address: "", activeCount: 1 };
  assert.deepEqual(nl.campaignSendProblems(content, ready), ["Agrega la dirección de la tienda en Apariencia → Datos de la tienda → Contacto."]);
  assert.deepEqual(nl.campaignSendProblems(content, ready, "en"), ["Add the store address in Appearance → Store data → Contact."]);
}
```

- [ ] **Step 2: Run tests and the text check to verify they fail**

Run: `npm run -s check:permissions` → Expected: FAIL.
Run: `npm run -s check:admin-text -- components/admin/newsletter/CampaignsTab.tsx components/admin/newsletter/NewCampaignButton.tsx components/admin/newsletter/CampaignEditor.tsx components/admin/newsletter/ProductPicker.tsx components/admin/newsletter/CampaignSendPanel.tsx "app/(admin)/admin/boletin/[id]"` → Expected: exit 1 with findings.

- [ ] **Step 3: Translate**

- `lib/newsletter.ts`: `validateCampaign` and `campaignSendProblems` take `ui` last; their messages go through `tr`. `CAMPAIGN_STATUS_LABELS` typed `AdminText`.
- `lib/campaignSend.ts`: `runBatch(campaign, ui)`; the `pauseWith` messages (`El correo de salida no está configurado…`, `Llegaste al tope de hoy ({limit}). Continúa mañana.`, the address message, `smtpErrorMessage(…, ui)`) are built with `tr(ui, …)` before saving. `OTHER_TAB` stays an `ActionError` text.
- `actions/newsletterAdmin.ts`: campaign actions get `ui`; `startCampaign` uses `campaignSendProblems(…, ui)` and `throw ActionError.raw(problems[0])`; `sendCampaignBatch` calls `runBatch(campaign, ui)`.
- Components: translation rules. `CampaignSendPanel`'s `LEFT_OPEN`, `retryText`, the progress line (`{done} de {total} · Enviados: {sent} · Fallidos: {failed}`) and the confirmation sentence become `tr` templates with variables. Campaign list dates use `dateLocale(ui)`.
- Texts in `lib/adminText/newsletter.ts`.

- [ ] **Step 4: Verify**

Run both Step 2 commands → `ok` and `0 sin traducir`. Then the typecheck, lint on the touched files, and the build.

- [ ] **Step 5: Stage**

Stage every file you touched in this task, plus `lib/adminText/newsletter.ts` and `scripts/check-permissions.mjs`.

---

### Task 11: Final sweep and browser walkthrough

**Files:**
- Modify: whatever the sweep still finds (any file under `components/admin`, `app/(admin)`, and the `lib/` label or message constants the panel shows), plus their `lib/adminText/*.ts` maps.

**Interfaces:**
- Consumes: everything above.
- Produces: `npm run -s check:admin-text` (whole panel) → `0 sin traducir`.

- [ ] **Step 1: Sweep the whole panel**

Run: `npm run -s check:admin-text`
Expected: `check-admin-text: 0 sin traducir`. If not, translate what it lists (translation rules) and run it again.

- [ ] **Step 2: Full verification**

Run the typecheck, `npm run -s check:permissions`, `node scripts/check-admin-text.mjs --self-test`, lint on every file changed in the branch (`git diff --name-only master...HEAD` plus staged files), and the build.
Expected: all clean, build exit 0.

- [ ] **Step 3: Browser walkthrough in English (no writes)**

Dev server on 3000. Open `/admin`, switch to `EN`, and visit every section in the menu: Inicio, Pedidos (open one order's drawer if there are orders), Productos (list and one product editor), Categorías, Marcas, Apariencia (every tab), Páginas, Boletín (both tabs; open a campaign if one exists), Usuarios, Ajustes.
On each page, in the browser console, look for leftover Spanish: `document.body.innerText.match(/\b(el|la|los|las|de|del|para|con|sin|una?|guardar|borrar|nuevo|nueva|campo|tienda|pedido|producto)\b/gi)`. Expected: `null`, or only words inside content the owner wrote (product names, page text). List anything else and translate it (back to Step 1).
Also check, without saving:
- Product editor with a product that has no English name: the content-language badge says `English missing`.
- Empty a required field in Apariencia → Datos de la tienda (store name), see `Required`, then type the same name back (no save happens).

- [ ] **Step 4: Spanish and store regression (no writes)**

Switch the panel to `ES` and revisit Inicio, Productos and Apariencia: the texts are the same as before this branch. Open the store home `/`: it is in the store's language. In the footer newsletter form, submit an invalid email (rejected before any write): the message is the store's usual one.
Stop the dev server.

- [ ] **Step 5: Stage**

Stage every file changed in this task.
