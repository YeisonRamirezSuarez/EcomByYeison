# Unión del `master` de GitHub — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una rama `merge/github-master` que une `origin/master` (21 commits) con `feature/roles-admin-panel`, funciona con Next 16 / Clerk 7 / Sanity 5 / Stripe 20, compila sin errores y respeta la tienda configurable por cliente.

**Architecture:** Se parte de `origin/master` y se une la rama local. Los conflictos se resuelven primero de forma mecánica (Task 1, tomando un lado por archivo). Después, por tareas, se aplican las reescrituras finales:

- adaptación a las versiones nuevas;
- idiomas con variables;
- layouts y paleta por tienda;
- pedidos con roles;
- correos;
- PWA;
- build limpio.

Las reglas puras nuevas (`t` con variables, `priceRanges` con etiquetas, paletas, pestañas) se prueban con el script de chequeo.

**Tech Stack:** Next.js 16 (App Router, server actions, `proxy.ts` con CSP), React 19, Clerk 7, Sanity 5 / next-sanity 12, Stripe 20, nodemailer, Tailwind v4, zustand, Node 22.

**Spec:** `docs/superpowers/specs/2026-10-06-merge-github-master-design.md`

## Global Constraints

- Nada se sube a GitHub ni se toca `master` hasta que el usuario apruebe. Nunca `git push --force`.
- Gana lo local: logo, nombre, banner, contacto, redes, páginas, Newsletter, favicon configurado, paleta por tienda, moneda, roles, panel.
- Gana GitHub: pedidos, stock, correos (con ajustes), direcciones, búsqueda, CSP, PWA, AuthModal, esqueletos, filtros en móvil, diccionario ES/EN.
- Sin paleta por visitante: sin `ThemePanel`, `ThemeInitializer`, script de arranque de paleta ni `themeName` en el store.
- Pestañas del panel en orden `tienda, marca, paginas, pedidos, usuarios`; `pedidos` exige permiso `pedidos`.
- El panel de administración queda solo en español; la tienda pasa por `t()`.
- Sin datos de marca fijos ("Ecom by Yeison", teléfono, correo, dirección) en el diccionario, correos, manifest ni metadatos.
- `npm run build` debe pasar sin errores de TypeScript (ya no hay `ignoreBuildErrors`).
- Sin dependencias nuevas, salvo ajustar la versión de `@clerk/localizations` a la compatible con Clerk 7.
- Servidor de desarrollo: detener lo que ocupe 3000/3001 antes de iniciar; solo en 3000.

## Review Focus

1. Empleado o cliente que entra directo a `/admin/orders` o llama `/api/admin/orders`: 404 en la página y 403 en la API, nunca datos. Task 5 (prueba con `curl` sin sesión y manual con empleado).
2. Cambio de idioma con partes renderizadas en el servidor (encabezado, pie, páginas): todo cambia junto, sin mezcla de idiomas. Task 3 (`router.refresh()` + prueba manual).
3. Visitante con `themeName` viejo guardado en `localStorage` (de la versión de GitHub): la tienda usa la paleta de la tienda, no la vieja. Task 4 (el store ya no lee `themeName`; prueba manual con el valor viejo puesto a mano).
4. CSP de `proxy.ts` en desarrollo y producción: imágenes de `cdn.sanity.io`, acciones de servidor y Clerk funcionan sin bloqueos en consola. Task 2 (prueba de humo) y Task 8 (recorrido completo).
5. Correo de pedido en COP: el monto sale como `$ 1.250.000`, no `$1250000.00`. Task 6 (`formatPrice` con la moneda en mayúsculas; prueba en el script de chequeo de `formatPrice` con `"cop".toUpperCase()`).

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `lib/i18n.ts` | Diccionario ES/EN, `t(locale, key, vars?)`, `LOCALE_COOKIE`. |
| `lib/locale.ts` | `getServerLocale()` (lee la cookie). |
| `components/LanguageToggle.tsx` (nuevo) | Botón ES/EN en el encabezado. |
| `components/LocaleSync.tsx` (nuevo) | Sincroniza `lang` y cookie con el store (lo que hacía `ThemeInitializer`). |
| `constants/themes.ts` | 16 paletas. |
| `constants/currencies.ts` | `priceRanges(code, labels?)`. |
| `app/layout.tsx` | Metadatos, viewport y paleta desde `siteSettings`; PWA; `StoreSettingsProvider`. |
| `app/(client)/layout.tsx` | Clerk con nonce, encabezado, pie, `InstallPrompt`. |
| `components/Header.tsx`, `components/Footer.tsx` | Diseño de GitHub + datos de `siteSettings` + `t()`. |
| `components/admin/OrdersTab.tsx` (nuevo) | Pestaña "Pedidos" del panel. |
| `app/(client)/admin/layout.tsx`, `app/(client)/api/admin/orders/*` | Protegidos por permiso `pedidos`. |
| `lib/email.ts`, `lib/orders.ts` | Correos con nombre, paleta y moneda de la tienda; foto correcta. |
| `app/manifest.ts`, `public/offline.html` | PWA con la marca de la tienda / genérica. |

---

### Task 1: Rama y resolución de conflictos

**Files:** los 19 archivos en conflicto (ver tabla), más `app/layout.tsx` y `app/(client)/layout.tsx` para quitar imports de archivos borrados.

**Interfaces:**
- Produces: árbol sin marcas de conflicto, commit de unión. Estado intermedio: compila parcialmente; las tareas siguientes terminan la integración.

- [ ] **Step 1: Crear la rama e iniciar la unión**

```bash
git fetch origin
git checkout -b merge/github-master origin/master
git merge --no-ff feature/roles-admin-panel
```

Expected: `Automatic merge failed; fix conflicts and then commit the result.` y 19 rutas en conflicto (`git diff --name-only --diff-filter=U`).

- [ ] **Step 2: Resolver tomando un lado por archivo**

| Archivo | Acción |
|---|---|
| `app/(client)/layout.tsx` | `--ours` (GitHub) |
| `app/layout.tsx` | `git checkout --ours -- app/layout.tsx` (GitHub) |
| `app/not-found.tsx` | `--ours` (GitHub) |
| `components/Footer.tsx` | `--ours` (GitHub) |
| `components/Header.tsx` | `--ours` (GitHub) |
| `components/OrderDetailDialog.tsx` | `--ours` (GitHub), luego Step 3 |
| `components/Shop.tsx` | `--ours` (GitHub), luego Step 4 |
| `constants/data.ts` | `--ours` (GitHub) |
| `store.ts` | `--ours` (GitHub) |
| `package.json`, `package-lock.json` | `--ours` (GitHub), luego Step 5 |
| `components/HomeBanner.tsx` | `--theirs` (local), luego Step 6 |
| `components/Logo.tsx` | `--theirs` (local) |
| `components/shop/PriceList.tsx` | `--theirs` (local) |
| `app/globals.css` | Editar a mano: conservar las dos partes (animaciones de GitHub + regla `.cl-footer > :not(.cl-footerAction) { display: none; }`). |
| `components/ThemePanel.tsx`, `components/ThemeInitializer.tsx` | `git rm` |
| `components/FooterTop.tsx` | `git rm` (el pie de GitHub ya muestra el contacto) |
| `public/favicon.ico` | `git rm` (GitHub usa `public/favicon.png`; el respaldo pasa a `/favicon.png`) |

En esta unión `--ours` = `origin/master` (rama actual) y `--theirs` = `feature/roles-admin-panel`.

```bash
for f in "app/(client)/layout.tsx" app/layout.tsx app/not-found.tsx components/Footer.tsx components/Header.tsx components/OrderDetailDialog.tsx components/Shop.tsx constants/data.ts store.ts package.json package-lock.json; do git checkout --ours -- "$f"; done
for f in components/HomeBanner.tsx components/Logo.tsx components/shop/PriceList.tsx; do git checkout --theirs -- "$f"; done
git rm -q --force components/ThemePanel.tsx components/ThemeInitializer.tsx components/FooterTop.tsx public/favicon.ico
```

- [ ] **Step 3: `components/OrderDetailDialog.tsx` — moneda del pedido**

En cada `<PriceFormatter` del archivo agregar la prop `currency={order?.currency}` (son 4: precio del producto, descuento, subtotal, total).

Run: `grep -c "currency={order?.currency}" components/OrderDetailDialog.tsx`
Expected: `4`

- [ ] **Step 4: `components/Shop.tsx` — rangos por moneda**

Agregar `import { parsePriceRange } from "@/constants/currencies";`. Reemplazar el cálculo de `minPrice`/`maxPrice` (el bloque `let minPrice = 0; let maxPrice = 10000; if (selectedPrice) {...}`) por:

```ts
      const { minPrice, maxPrice } = parsePriceRange(selectedPrice);
```

y en la consulta GROQ reemplazar `price >= $minPrice && price <= $maxPrice` por:

```
price >= $minPrice && (!defined($maxPrice) || price <= $maxPrice)
```

Run: `grep -c "parsePriceRange\|defined(\$maxPrice)" components/Shop.tsx`
Expected: `3` (import, uso y consulta).

- [ ] **Step 5: `package.json` — scripts locales**

En `scripts` agregar después de `typegen`:

```json
    "check:permissions": "node --experimental-strip-types scripts/check-permissions.mjs",
    "seed:yeison": "node --env-file=.env.local scripts/seed-ecom-by-yeison.mjs"
```

- [ ] **Step 6: `components/HomeBanner.tsx` — atributo `sizes` de GitHub**

En el `<Image` del banner agregar:

```tsx
              sizes="(min-width: 1280px) 384px, (min-width: 1024px) 320px, 256px"
```

- [ ] **Step 7: Quitar los imports de archivos borrados**

En `app/layout.tsx`: borrar `import ThemeInitializer from "@/components/ThemeInitializer";` y la línea `<ThemeInitializer />`.
En `app/(client)/layout.tsx`: borrar `import ThemePanel from "@/components/ThemePanel";` y `<ThemePanel />`.
(Las dos se reescriben completas en Task 4.)

- [ ] **Step 8: Verificar y hacer el commit de unión**

Run: `git diff --check; grep -rln "^<<<<<<<\|^>>>>>>>" --include=*.ts --include=*.tsx --include=*.css --include=*.json . | grep -v node_modules; node --no-warnings --experimental-strip-types scripts/check-permissions.mjs`
Expected: sin salida de marcas de conflicto y `check-permissions: ok`.

```bash
git add -A
git commit -m "merge: une el master de GitHub con roles, panel e identidad de marca"
```

---

### Task 2: Dependencias y versiones nuevas

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `actions/admin.ts`, `actions/brand.ts` (`updateTag`)
- Modify: `components/ClientClerkProvider.tsx` (aviso de modo desarrollo)

**Interfaces:**
- Consumes: árbol de Task 1.
- Produces: `node_modules` instalado; acciones que invalidan la caché con `updateTag(SITE_SETTINGS_TAG)`.

- [ ] **Step 1: Instalar**

Run: `npm install 2>&1 | tail -5`
Expected: termina sin `ERR!`.

- [ ] **Step 2: Versión de `@clerk/localizations` compatible con Clerk 7**

Run: `npm ls @clerk/shared @clerk/localizations @clerk/nextjs 2>&1 | head -20`
Expected: un solo `@clerk/shared` (o la misma versión mayor en todos). Si `@clerk/localizations` trae otra mayor de `@clerk/shared` que `@clerk/nextjs`, instalar la línea que coincide:

```bash
npm view @clerk/localizations versions --json | tail -5
npm install @clerk/localizations@<versión cuya dependencia @clerk/shared coincide con la de @clerk/nextjs>
```

Registrar la versión elegida en el ledger como ruling.

- [ ] **Step 3: Invalidación de caché en Next 16**

Run: `grep -n "export declare function updateTag\|export declare function revalidateTag" node_modules/next/dist/server/web/spec-extension/revalidate.d.ts`
Expected: existen `updateTag(tag: string)` y `revalidateTag(tag: string, profile: ...)`.

En `actions/admin.ts` y `actions/brand.ts`: cambiar el import `import { revalidateTag } from "next/cache";` por `import { updateTag } from "next/cache";` y cada `revalidateTag(SITE_SETTINGS_TAG)` por `updateTag(SITE_SETTINGS_TAG)` (las acciones son server actions: `updateTag` hace que el admin vea su cambio al instante).

Run: `grep -rn "revalidateTag\|updateTag" actions | wc -l; grep -rn "revalidateTag" actions | wc -l`
Expected: el primer número > 0 y el segundo `0`.

- [ ] **Step 4: Aviso de modo desarrollo de Clerk**

En `components/ClientClerkProvider.tsx` agregar al `<ClerkProvider` la prop:

```tsx
      appearance={{ layout: { unsafe_disableDevelopmentModeWarnings: true } }}
```

- [ ] **Step 5: Prueba de humo**

Detener lo que ocupe 3000/3001 y correr `npm run dev` en segundo plano.

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/ ; curl -s -I http://localhost:3000/ | grep -i "content-security-policy" | head -1 | cut -c1-120`
Expected: `200` y una línea `content-security-policy: ...`.

Abrir `http://localhost:3000/` en el navegador y revisar la consola: sin errores de CSP que bloqueen `cdn.sanity.io`, Clerk o scripts de Next.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json actions/admin.ts actions/brand.ts components/ClientClerkProvider.tsx
git commit -m "chore: adaptar acciones y Clerk a Next 16 y Clerk 7"
```

---

### Task 3: Idiomas con la marca de la tienda

**Files:**
- Modify: `lib/i18n.ts`, `lib/locale.ts`, `constants/currencies.ts`, `scripts/check-permissions.mjs`
- Create: `components/LanguageToggle.tsx`
- Modify: `components/Header.tsx`, `components/Footer.tsx`, `components/NewsletterForm.tsx`, `components/ContactForm.tsx`, `app/(client)/contact/page.tsx`, `app/not-found.tsx`, `components/shop/PriceList.tsx`, `components/AuthModal.tsx`, `components/InstallPrompt.tsx`, `app/(client)/{about,terms,privacy,faqs,help}/page.tsx`

**Interfaces:**
- Consumes: `getSiteSettings()`, `useBrand()`, `formatPrice`, `CURRENCIES`, `isEmail`.
- Produces: `t(locale: Locale, key: keyof Messages, vars?: Record<string, string>): string`; `LOCALE_COOKIE` exportado desde `lib/i18n.ts`; `priceRanges(code: string, labels?: PriceRangeLabels)`; `PriceRangeLabels = { under: string; over: string }`; `LanguageToggle` props `{ initialLocale: Locale }`; `NewsletterForm` props `{ storeName: string; locale: Locale }`; `ContactForm` props `{ email: string; storeName: string; locale: Locale }`.

- [ ] **Step 1: Pruebas que fallan**

Agregar al final de `scripts/check-permissions.mjs`, antes de `console.log("check-permissions: ok");`:

```js
// i18n
const i18n = await import("../lib/i18n.ts");
assert.equal(i18n.t("es", "headerWelcome", { store: "Nike" }), "Bienvenido a Nike");
assert.equal(i18n.t("en", "headerWelcome", { store: "Nike" }), "Welcome to Nike");
assert.equal(i18n.t("en", "headerFreeShipping", { amount: "$99" }), "Free shipping on orders over $99");
assert.equal(i18n.t("es", "newsletterConsent", { store: "Adidas" }), "Acepto recibir correos de Adidas");
assert.equal(i18n.t("es", "navHome"), "Inicio");
assert.equal(i18n.t("es", "headerWelcome"), "Bienvenido a {store}");
assert.equal(i18n.t("es", "headerWelcome", {}), "Bienvenido a {store}");
assert.equal(i18n.LOCALE_COOKIE, "app-locale");
assert.equal(JSON.stringify(i18n.MESSAGES).includes("Yeison"), false);
assert.deepEqual(Object.keys(i18n.MESSAGES.en).sort(), Object.keys(i18n.MESSAGES.es).sort());

// Price range labels per language
assert.deepEqual(priceRanges("USD", { under: "Under", over: "Over" }).map((r) => r.title), [
  "Under $100",
  "$100 - $200",
  "$200 - $300",
  "$300 - $500",
  "Over $500",
]);
```

- [ ] **Step 2: Correr y ver que falla**

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs 2>&1 | grep -m1 "Error\|ok"`
Expected: `AssertionError` en `headerWelcome` (hoy devuelve "Bienvenido a Ecom by Yeison").

- [ ] **Step 3: `lib/i18n.ts`**

1. Debajo de `export type Locale = "es" | "en";` agregar:

```ts
export const LOCALE_COOKIE = "app-locale";
```

2. En `type Messages` borrar `footerScheduleValue: string;` y `footerBrandDescription: string;`, y agregar antes de `};`:

```ts
  languageToggle: string;
  newsletterConsent: string;
  newsletterSuccess: string;
  newsletterInvalidEmail: string;
  newsletterConsentRequired: string;
  newsletterFailed: string;
  newsletterSending: string;
  contactTitle: string;
  contactIntro: string;
  contactName: string;
  contactMessage: string;
  contactSend: string;
  contactSubject: string;
  contactBodyName: string;
  contactBodyEmail: string;
  pageAboutTitle: string;
  pageTermsTitle: string;
  pagePrivacyTitle: string;
  pageFaqsTitle: string;
  pageHelpTitle: string;
  helpNotFoundTitle: string;
  helpNotFoundBody: string;
  shopPriceUnder: string;
  shopPriceOver: string;
```

3. En `es`: borrar las líneas `footerScheduleValue` y `footerBrandDescription`; cambiar:

```ts
    authSignInSubtitle: "Accede a tu cuenta de {store}",
    authSignUpSubtitle: "Crea tu cuenta en {store}",
    headerFreeShipping: "Envío gratis en pedidos superiores a {amount}",
    headerWelcome: "Bienvenido a {store}",
    notFoundGoHome: "Ir al inicio de {store}",
    installTitle: "Instala {store}",
```

y agregar al final del objeto `es`:

```ts
    languageToggle: "Cambiar idioma",
    newsletterConsent: "Acepto recibir correos de {store}",
    newsletterSuccess: "¡Listo! Te suscribiste",
    newsletterInvalidEmail: "Ingresa un correo válido",
    newsletterConsentRequired: "Debes aceptar para suscribirte",
    newsletterFailed: "No pudimos suscribirte, intenta de nuevo",
    newsletterSending: "Enviando…",
    contactTitle: "Contáctanos",
    contactIntro: "¿Tienes alguna duda, sugerencia o necesitas ayuda con tu pedido? Escríbenos y te responderemos a la brevedad.",
    contactName: "Tu nombre",
    contactMessage: "Tu mensaje",
    contactSend: "Enviar mensaje",
    contactSubject: "Mensaje desde {store}",
    contactBodyName: "Nombre",
    contactBodyEmail: "Correo",
    pageAboutTitle: "Sobre Nosotros",
    pageTermsTitle: "Términos y Condiciones",
    pagePrivacyTitle: "Política de Privacidad",
    pageFaqsTitle: "Preguntas Frecuentes",
    pageHelpTitle: "Centro de Ayuda",
    helpNotFoundTitle: "¿No encontraste lo que buscas?",
    helpNotFoundBody: "Nuestro equipo está disponible para ayudarte.",
    shopPriceUnder: "Menos de",
    shopPriceOver: "Más de",
```

4. En `en`: borrar `footerScheduleValue` y `footerBrandDescription`; cambiar:

```ts
    authSignInSubtitle: "Access your {store} account",
    authSignUpSubtitle: "Create your {store} account",
    headerFreeShipping: "Free shipping on orders over {amount}",
    headerWelcome: "Welcome to {store}",
    notFoundGoHome: "Go to {store}'s home page",
    installTitle: "Install {store}",
```

y agregar al final del objeto `en`:

```ts
    languageToggle: "Change language",
    newsletterConsent: "I agree to receive emails from {store}",
    newsletterSuccess: "Done! You're subscribed",
    newsletterInvalidEmail: "Enter a valid email",
    newsletterConsentRequired: "You must agree to subscribe",
    newsletterFailed: "We couldn't subscribe you, please try again",
    newsletterSending: "Sending…",
    contactTitle: "Contact us",
    contactIntro: "Have a question, a suggestion or need help with your order? Write to us and we'll get back to you soon.",
    contactName: "Your name",
    contactMessage: "Your message",
    contactSend: "Send message",
    contactSubject: "Message from {store}",
    contactBodyName: "Name",
    contactBodyEmail: "Email",
    pageAboutTitle: "About Us",
    pageTermsTitle: "Terms & Conditions",
    pagePrivacyTitle: "Privacy Policy",
    pageFaqsTitle: "FAQs",
    pageHelpTitle: "Help Center",
    helpNotFoundTitle: "Didn't find what you were looking for?",
    helpNotFoundBody: "Our team is here to help you.",
    shopPriceUnder: "Under",
    shopPriceOver: "Over",
```

5. Reemplazar la función `t`:

```ts
// `{name}` placeholders are filled from vars; unknown placeholders stay as written.
export function t(locale: Locale, key: keyof Messages, vars?: Record<string, string>): string {
  const message = MESSAGES[locale]?.[key] ?? MESSAGES.es[key];
  return vars ? message.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match) : message;
}
```

6. En `lib/locale.ts`: reemplazar `export const LOCALE_COOKIE = "app-locale";` por `import { LOCALE_COOKIE } from "@/lib/i18n";` + `export { LOCALE_COOKIE };` (mantener `Locale` importado como tipo).

- [ ] **Step 4: `constants/currencies.ts` — etiquetas por idioma**

Reemplazar la firma y los textos de `priceRanges`:

```ts
export type PriceRangeLabels = { under: string; over: string };

export function priceRanges(
  code: string,
  labels: PriceRangeLabels = { under: "Menos de", over: "Más de" }
): { title: string; value: string }[] {
  const currency = isCurrencyCode(code) ? code : DEFAULT_CURRENCY;
  const f = (amount: number) => formatPrice(amount, currency, 0);
  return CURRENCIES[currency].priceRanges.map(([min, max]) => ({
    title:
      max === null
        ? `${labels.over} ${f(min)}`
        : min === 0
          ? `${labels.under} ${f(max)}`
          : `${f(min)} - ${f(max)}`,
    value: `${min}-${max ?? ""}`,
  }));
}
```

- [ ] **Step 5: Correr y ver que pasa**

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs`
Expected: `check-permissions: ok`

- [ ] **Step 6: Crear `components/LanguageToggle.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import useStore from "@/store";
import { LOCALE_COOKIE, t, type Locale } from "@/lib/i18n";

// Shows the language to switch to. Server-rendered parts re-render via router.refresh().
const LanguageToggle = ({ initialLocale }: { initialLocale: Locale }) => {
  const router = useRouter();
  const { locale: storeLocale, setLocale, hasHydrated } = useStore();
  const locale = hasHydrated ? storeLocale : initialLocale;
  const next: Locale = locale === "es" ? "en" : "es";

  const change = () => {
    setLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={change}
      aria-label={t(locale, "languageToggle")}
      title={t(locale, "languageToggle")}
      className="text-[11px] font-bold border border-gray-300 rounded-md px-1.5 py-0.5 hover:text-shop_light_green hover:border-shop_light_green hoverEffect"
    >
      {next.toUpperCase()}
    </button>
  );
};

export default LanguageToggle;
```

- [ ] **Step 7: Reemplazar `components/Header.tsx`**

```tsx
import React from "react";
import Container from "./Container";
import Logo from "./Logo";
import HeaderMenu from "./HeaderMenu";
import SearchBar from "./SearchBar";
import CartIcon from "./CartIcon";
import FavoriteButton from "./FavoriteButton";
import SignIn from "./SignIn";
import MobileMenu from "./MobileMenu";
import LanguageToggle from "./LanguageToggle";
import AdminButton from "./admin/AdminButton";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ClerkLoaded, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ClipboardList, Truck, ShieldCheck, HeadphonesIcon } from "lucide-react";
import { getMyOrders } from "@/sanity/queries";
import { getServerLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { adminTabs, roleFromMetadata } from "@/lib/permissions";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { CURRENCIES, formatPrice } from "@/constants/currencies";

const Header = async () => {
  const locale = await getServerLocale();
  const user = await currentUser();
  const { userId } = await auth();
  let orders = null;
  if (userId) {
    orders = await getMyOrders(userId);
  }
  const tabs = user ? adminTabs(roleFromMetadata(user.publicMetadata)) : [];
  const settings = await getSiteSettings();
  const freeShippingFrom = formatPrice(
    CURRENCIES[settings.currency].freeShippingFrom,
    settings.currency,
    0
  );

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement Bar */}
      <div className="bg-shop_dark_green text-white text-xs py-2 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Truck size={12} />
              {t(locale, "headerFreeShipping", { amount: freeShippingFrom })}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} />
              {t(locale, "headerSecurePurchase")}
            </span>
            <span className="flex items-center gap-1.5">
              <HeadphonesIcon size={12} />
              {t(locale, "headerSupport")}
            </span>
          </div>
          <span className="font-semibold tracking-wide">
            {t(locale, "headerWelcome", { store: settings.storeName })}
          </span>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm pt-[env(safe-area-inset-top)] md:pt-0">
        <Container className="flex items-center justify-between py-4 text-lightColor">
          <div className="w-auto md:w-1/3 flex items-center gap-2.5 justify-start">
            <MobileMenu />
            <Logo />
          </div>
          <HeaderMenu />
          <div className="w-auto md:w-1/3 flex items-center justify-end gap-4">
            <SearchBar placeholder={t(locale, "searchPlaceholder")} />
            <div className="flex items-center gap-3">
              <LanguageToggle initialLocale={locale} />
              <CartIcon />
              <FavoriteButton />
              {user && (
                <Link
                  href={"/orders"}
                  className="group relative hover:text-shop_light_green hoverEffect"
                  title={t(locale, "headerMyOrders")}
                >
                  <ClipboardList size={20} />
                  <span className="absolute -top-1.5 -right-1.5 bg-shop_btn_dark_green text-white h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center shadow">
                    {orders?.length ?? 0}
                  </span>
                </Link>
              )}
              <ClerkLoaded>{user ? <UserButton /> : <SignIn />}</ClerkLoaded>
            </div>
          </div>
        </Container>
      </div>
      {tabs.length > 0 && <AdminButton tabs={tabs} settings={settings} />}
    </header>
  );
};

export default Header;
```

- [ ] **Step 8: Reemplazar `components/Footer.tsx`**

```tsx
import React from "react";
import Container from "./Container";
import Logo from "./Logo";
import SocialMedia from "./SocialMedia";
import NewsletterForm from "./NewsletterForm";
import { SubText, SubTitle } from "./ui/text";
import { getQuickLinksData } from "@/constants/data";
import Link from "next/link";
import { getServerLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { getCategories } from "@/sanity/queries";
import { Category } from "@/sanity.types";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { isEmail } from "@/lib/validation";

const Footer = async () => {
  const locale = await getServerLocale();
  const { storeName, description, contact } = await getSiteSettings();
  const quickLinksData = getQuickLinksData(locale);
  // Real categories from Sanity, only those that actually have products so the
  // footer never links to an empty category. getCategories adds productCount.
  const allCategories: (Category & { productCount?: number })[] =
    await getCategories();
  const categoriesData = allCategories.filter(
    (c) => (c.productCount ?? 0) > 0
  );
  // Contact comes from siteSettings; empty fields are hidden.
  const contactItems = [
    {
      title: t(locale, "footerVisitUs"),
      value: contact.address,
      href: `https://maps.google.com/?q=${encodeURIComponent(contact.address)}`,
      icon: <MapPin className="h-3.5 w-3.5 text-shop_dark_green" />,
    },
    {
      title: t(locale, "footerCallUs"),
      value: contact.phone,
      href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
      icon: <Phone className="h-3.5 w-3.5 text-shop_dark_green" />,
    },
    {
      title: t(locale, "footerSchedule"),
      value: contact.hours,
      href: undefined,
      icon: <Clock className="h-3.5 w-3.5 text-shop_dark_green" />,
    },
    {
      title: t(locale, "footerWriteUs"),
      value: contact.email,
      href: isEmail(contact.email) ? `mailto:${contact.email}` : undefined,
      icon: <Mail className="h-3.5 w-3.5 text-shop_dark_green" />,
    },
  ].filter((item) => item.value);

  return (
    <footer
      id="site-footer"
      className="border-t border-gray-200 bg-gradient-to-b from-white to-gray-50/70"
    >
      <Container className="py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-7">
          <div className="space-y-3 lg:col-span-5">
            <Logo />
            {/* Marketing copy & contact details add a lot of height on phones;
                keep the mobile footer minimal (logo + social + quick links). */}
            {description && (
              <SubText className="hidden md:block leading-6 text-[13px]">{description}</SubText>
            )}
            <SocialMedia
              className="text-darkColor/60 gap-2.5"
              iconClassName="border-gray-300 hover:border-shop_light_green hover:text-shop_light_green p-1.5"
              tooltipClassName="bg-darkColor text-white"
            />
            {contactItems.length > 0 && (
              <ul className="hidden md:block space-y-1.5 pt-1">
                {contactItems.map((item) => (
                  <li key={item.title} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="mt-0.5">{item.icon}</span>
                    <span className="font-medium text-gray-700">{item.title}:</span>
                    {item.href ? (
                      <Link
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="hover:text-shop_dark_green hoverEffect"
                      >
                        {item.value}
                      </Link>
                    ) : (
                      <span>{item.value}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-2">
            <SubTitle className="text-sm uppercase tracking-wider text-gray-700">{t(locale, "footerQuickLinks")}</SubTitle>
            <ul className="space-y-2 mt-3 text-sm">
              {quickLinksData?.map((item) => (
                <li key={item?.title}>
                  <Link href={item?.href} className="text-gray-600 hover:text-shop_light_green hoverEffect font-medium">
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden md:block lg:col-span-2">
            <SubTitle className="text-sm uppercase tracking-wider text-gray-700">{t(locale, "footerCategories")}</SubTitle>
            <ul className="space-y-2 mt-3 text-sm">
              {categoriesData?.map((item) => (
                <li key={item?._id}>
                  <Link href={`/category/${item?.slug?.current}`} className="text-gray-600 hover:text-shop_light_green hoverEffect font-medium capitalize">
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden md:block space-y-3 lg:col-span-3">
            <SubTitle className="text-sm uppercase tracking-wider text-gray-700">{t(locale, "footerNewsletter")}</SubTitle>
            <SubText className="leading-6 text-[13px]">{t(locale, "footerNewsletterDesc")}</SubText>
            <NewsletterForm storeName={storeName} locale={locale} />
            <div className="inline-flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-shop_dark_green" />
              <span>{t(locale, "footerNewsletterNote")}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200/80 flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between text-xs md:text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} <strong className="text-gray-700">{storeName}</strong>. {t(locale, "footerCopyright")}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-shop_light_green hoverEffect">{t(locale, "footerPrivacy")}</Link>
            <Link href="/terms" className="hover:text-shop_light_green hoverEffect">{t(locale, "footerTerms")}</Link>
            <Link href="/help" className="hover:text-shop_light_green hoverEffect">{t(locale, "footerHelpCenter")}</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
```

- [ ] **Step 9: Reemplazar `components/NewsletterForm.tsx`**

```tsx
"use client";

import React, { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { subscribe } from "@/actions/newsletter";
import { t, type Locale } from "@/lib/i18n";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const NewsletterForm = ({ storeName, locale }: { storeName: string; locale: Locale }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await subscribe({
        email: String(data.get("email") ?? ""),
        consent: data.get("consent") === "on",
        website: String(data.get("website") ?? ""),
      });
      if (!result.ok) {
        setErrors(result.errors);
        if (result.errors.form) toast.error(t(locale, "newsletterFailed"));
        return;
      }
      setErrors({});
      form.reset();
      toast.success(t(locale, "newsletterSuccess"));
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>
      <Input
        name="email"
        type="email"
        className="h-10"
        placeholder={t(locale, "footerEmailPlaceholder")}
        aria-label={t(locale, "footerEmailPlaceholder")}
        aria-invalid={Boolean(errors.email)}
      />
      {errors.email && <p className="text-xs text-red-600">{t(locale, "newsletterInvalidEmail")}</p>}
      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input type="checkbox" name="consent" className="mt-0.5" />
        {t(locale, "newsletterConsent", { store: storeName })}
      </label>
      {errors.consent && <p className="text-xs text-red-600">{t(locale, "newsletterConsentRequired")}</p>}
      {/* Honeypot: hidden from people, filled by bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <Button
        type="submit"
        disabled={pending}
        className="w-full h-10 bg-shop_dark_green hover:bg-shop_dark_green/90 text-white font-semibold"
      >
        {pending ? t(locale, "newsletterSending") : t(locale, "footerSubscribe")}
      </Button>
    </form>
  );
};

export default NewsletterForm;
```

- [ ] **Step 10: Reemplazar `components/ContactForm.tsx`**

```tsx
"use client";

import React from "react";
import { t, type Locale } from "@/lib/i18n";

const INPUT =
  "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-shop_light_green/40";

// No backend: opens the visitor's mail app with the message addressed to the store.
const ContactForm = ({
  email,
  storeName,
  locale,
}: {
  email: string;
  storeName: string;
  locale: Locale;
}) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = `${t(locale, "contactBodyName")}: ${data.get("name")}\n${t(locale, "contactBodyEmail")}: ${data.get("email")}\n\n${data.get("message")}`;
    const subject = t(locale, "contactSubject", { store: storeName });
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="name" type="text" required placeholder={t(locale, "contactName")} className={INPUT} />
      <input name="email" type="email" required placeholder={t(locale, "footerEmailPlaceholder")} className={INPUT} />
      <textarea name="message" rows={4} required placeholder={t(locale, "contactMessage")} className={`${INPUT} resize-none`} />
      <button
        type="submit"
        className="bg-shop_dark_green text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90 transition-colors"
      >
        {t(locale, "contactSend")}
      </button>
    </form>
  );
};

export default ContactForm;
```

- [ ] **Step 11: Reemplazar `app/(client)/contact/page.tsx`**

```tsx
import Container from "@/components/Container";
import ContactForm from "@/components/ContactForm";
import { Title } from "@/components/ui/text";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { getServerLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { isEmail } from "@/lib/validation";

export default async function ContactPage() {
  const locale = await getServerLocale();
  const { contact, storeName } = await getSiteSettings();
  const items = [
    { title: t(locale, "footerWriteUs"), value: contact.email, Icon: Mail },
    { title: t(locale, "footerCallUs"), value: contact.phone, Icon: Phone },
    { title: t(locale, "footerVisitUs"), value: contact.address, Icon: MapPin },
    { title: t(locale, "footerSchedule"), value: contact.hours, Icon: Clock },
  ].filter((item) => item.value);

  return (
    <Container className="py-16">
      <Title className="mb-6">{t(locale, "contactTitle")}</Title>
      <div className="max-w-3xl grid md:grid-cols-2 gap-10">
        <div className="space-y-4">
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{t(locale, "contactIntro")}</p>
          {items.map(({ title, value, Icon }) => (
            <div
              key={title}
              className="flex items-center gap-4 group p-4 rounded-xl hover:bg-gray-50 hoverEffect"
            >
              <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green group-hover:bg-shop_light_green/10 hoverEffect">
                <Icon size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                <p className="text-gray-500 text-xs mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
        {isEmail(contact.email) && (
          <ContactForm email={contact.email} storeName={storeName} locale={locale} />
        )}
      </div>
    </Container>
  );
}
```

- [ ] **Step 12: Páginas de contenido — títulos por idioma**

En cada una de `about`, `terms`, `privacy`, `faqs`, `help` (`app/(client)/<página>/page.tsx`):
- agregar `import { getServerLocale } from "@/lib/locale";` y `import { t } from "@/lib/i18n";`;
- agregar `const locale = await getServerLocale();` como primera línea de la función;
- reemplazar el texto fijo del `<Title>` por la clave:

| Página | Texto actual | Nuevo |
|---|---|---|
| about | `Sobre Nosotros` | `{t(locale, "pageAboutTitle")}` |
| terms | `Términos y Condiciones` | `{t(locale, "pageTermsTitle")}` |
| privacy | `Política de Privacidad` | `{t(locale, "pagePrivacyTitle")}` |
| faqs | `Preguntas Frecuentes` | `{t(locale, "pageFaqsTitle")}` |
| help | `Centro de Ayuda` | `{t(locale, "pageHelpTitle")}` |

En `help` además:
- `¿No encontraste lo que buscas?` → `{t(locale, "helpNotFoundTitle")}`;
- `Nuestro equipo está disponible para ayudarte.` → `{t(locale, "helpNotFoundBody")}`;
- `Enviar mensaje` → `{t(locale, "contactSend")}`.

- [ ] **Step 13: `app/not-found.tsx` — nombre de la tienda**

Agregar `import { getSiteSettings } from "@/sanity/queries/siteSettings";`, después de `const locale = ...` agregar `const { storeName } = await getSiteSettings();` y cambiar `{t(locale, "notFoundGoHome")}` por `{t(locale, "notFoundGoHome", { store: storeName })}`.

- [ ] **Step 14: `components/shop/PriceList.tsx` — idioma + moneda**

Agregar `import useStore from "@/store";` y `import { t } from "@/lib/i18n";`. Reemplazar `const priceArray = priceRanges(useCurrency());` por:

```tsx
  const { locale } = useStore();
  const priceArray = priceRanges(useCurrency(), {
    under: t(locale, "shopPriceUnder"),
    over: t(locale, "shopPriceOver"),
  });
```

y `<Title className="text-base font-black">Precio</Title>` por `<Title className="text-base font-black">{t(locale, "shopPrice")}</Title>`. Si el archivo tiene texto fijo para "Restablecer selección", usar `{t(locale, "shopResetSelection")}`.

- [ ] **Step 15: `components/AuthModal.tsx` e `components/InstallPrompt.tsx` — nombre de la tienda**

En ambos agregar `import { useBrand } from "./StoreSettingsProvider";` y, en la línea siguiente a `const { locale } = useStore();`, `const { storeName } = useBrand();`. Luego:
- AuthModal: `t(locale, "authSignInSubtitle")` → `t(locale, "authSignInSubtitle", { store: storeName })` y lo mismo para `authSignUpSubtitle`.
- InstallPrompt: `t(locale, "installTitle")` → `t(locale, "installTitle", { store: storeName })`.

- [ ] **Step 16: Verificar**

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs && grep -rn "footerBrandDescription\|footerScheduleValue" --include=*.ts --include=*.tsx app components lib constants | wc -l`
Expected: `check-permissions: ok` y `0`.

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -c "lib/i18n\|LanguageToggle\|Header.tsx\|Footer.tsx\|NewsletterForm\|ContactForm\|contact/page\|not-found\|PriceList\|AuthModal\|InstallPrompt\|about/page\|terms/page\|privacy/page\|faqs/page\|help/page"`
Expected: `0` (los errores de otros archivos se cierran en tareas siguientes).

Con el servidor en 3000: `curl -s http://localhost:3000/ | grep -o "Bienvenido a <!-- -->[^<]*" | head -1` → `Bienvenido a <!-- -->Ecom by Yeison`; con la cookie en inglés: `curl -s -b "app-locale=en" http://localhost:3000/ | grep -o "Welcome to <!-- -->[^<]*" | head -1` → `Welcome to <!-- -->Ecom by Yeison`.

- [ ] **Step 17: Commit**

```bash
git add lib/i18n.ts lib/locale.ts constants/currencies.ts scripts/check-permissions.mjs components/LanguageToggle.tsx components/Header.tsx components/Footer.tsx components/NewsletterForm.tsx components/ContactForm.tsx "app/(client)" app/not-found.tsx components/shop/PriceList.tsx components/AuthModal.tsx components/InstallPrompt.tsx
git commit -m "feat: idiomas con la marca de la tienda y botón ES/EN en el encabezado"
```

---

### Task 4: Layouts y una paleta por tienda

**Files:**
- Modify: `constants/themes.ts`, `scripts/check-permissions.mjs`
- Create: `components/LocaleSync.tsx`
- Modify: `app/layout.tsx`, `app/(client)/layout.tsx`
- Modify: `store.ts`, `app/(client)/cart/page.tsx`, `actions/createCheckoutSession.ts`, `lib/orders.ts`, `sanity/schemaTypes/orderType.ts`, `public/offline.html`

**Interfaces:**
- Consumes: `getSiteSettings()`, `toClientBrand`, `themeCssVars`, `StoreSettingsProvider`.
- Produces: `THEMES` con 16 claves; `LocaleSync` (sin props); `generateMetadata` y `generateViewport` en `app/layout.tsx`; store sin `themeName`.

- [ ] **Step 1: Prueba que falla (paletas)**

En `scripts/check-permissions.mjs` reemplazar:

```js
assert.deepEqual(Object.keys(THEMES), ["emerald", "ocean", "violet", "crimson", "rose", "slate"]);
```

por:

```js
assert.deepEqual(Object.keys(THEMES), [
  "emerald", "ocean", "violet", "crimson", "rose", "slate",
  "amber", "mint", "sunset", "indigo", "cobalt", "forest", "lavender", "coral", "midnight", "sand",
]);
for (const key of Object.keys(THEMES)) {
  const vars = themeCssVars(key);
  assert.equal(Object.keys(vars).length, 8, key);
  assert.ok(Object.values(vars).every((v) => /^#[0-9a-f]{6}$/.test(v)), key);
}
assert.equal(themeCssVars("sand")["--color-shop_dark_green"], "#713f12");
```

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs 2>&1 | grep -m1 "AssertionError\|ok"`
Expected: `AssertionError`.

- [ ] **Step 2: `constants/themes.ts` — 10 paletas nuevas**

Agregar después de `slate` (mismo formato):

```ts
  amber: { name: "Ámbar", primary: "#78350f", primaryBtn: "#78350f", light: "#f59e0b", accent: "#d97706", accentLight: "#fde68a", bg: "#fffbeb", bgAlt: "#fef3c7", dealBg: "#fde68a" },
  mint: { name: "Menta", primary: "#064e3b", primaryBtn: "#064e3b", light: "#10b981", accent: "#14b8a6", accentLight: "#99f6e4", bg: "#ecfdf5", bgAlt: "#f0fdfa", dealBg: "#ccfbf1" },
  sunset: { name: "Atardecer", primary: "#7c2d12", primaryBtn: "#7c2d12", light: "#ea580c", accent: "#f43f5e", accentLight: "#fecdd3", bg: "#fff7ed", bgAlt: "#fff1f2", dealBg: "#ffe4e6" },
  indigo: { name: "Índigo", primary: "#312e81", primaryBtn: "#312e81", light: "#6366f1", accent: "#22d3ee", accentLight: "#bae6fd", bg: "#eef2ff", bgAlt: "#f5f3ff", dealBg: "#e0e7ff" },
  cobalt: { name: "Cobalto", primary: "#172554", primaryBtn: "#172554", light: "#2563eb", accent: "#38bdf8", accentLight: "#bae6fd", bg: "#eff6ff", bgAlt: "#dbeafe", dealBg: "#bfdbfe" },
  forest: { name: "Bosque", primary: "#14532d", primaryBtn: "#14532d", light: "#22c55e", accent: "#84cc16", accentLight: "#d9f99d", bg: "#f0fdf4", bgAlt: "#dcfce7", dealBg: "#bbf7d0" },
  lavender: { name: "Lavanda", primary: "#4c1d95", primaryBtn: "#4c1d95", light: "#8b5cf6", accent: "#c084fc", accentLight: "#f3e8ff", bg: "#faf5ff", bgAlt: "#f3e8ff", dealBg: "#e9d5ff" },
  coral: { name: "Coral", primary: "#9a3412", primaryBtn: "#9a3412", light: "#fb7185", accent: "#f97316", accentLight: "#fed7aa", bg: "#fff7ed", bgAlt: "#ffedd5", dealBg: "#fed7aa" },
  midnight: { name: "Medianoche", primary: "#0f172a", primaryBtn: "#0f172a", light: "#334155", accent: "#0ea5e9", accentLight: "#bae6fd", bg: "#f8fafc", bgAlt: "#e2e8f0", dealBg: "#cbd5e1" },
  sand: { name: "Arena", primary: "#713f12", primaryBtn: "#713f12", light: "#a16207", accent: "#d97706", accentLight: "#fde68a", bg: "#fffbeb", bgAlt: "#fef3c7", dealBg: "#fde68a" },
```

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs`
Expected: `check-permissions: ok`

- [ ] **Step 3: Crear `components/LocaleSync.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import useStore from "@/store";
import { LOCALE_COOKIE } from "@/lib/i18n";

// Keeps <html lang> and the locale cookie (read by server components) in sync with the saved choice.
const LocaleSync = () => {
  const { locale, hasHydrated } = useStore();

  useEffect(() => {
    if (!hasHydrated) return;
    document.documentElement.lang = locale;
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale, hasHydrated]);

  return null;
};

export default LocaleSync;
```

- [ ] **Step 4: Reemplazar `app/layout.tsx`**

```tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { Poppins } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import LocaleSync from "@/components/LocaleSync";
import StoreSettingsProvider from "@/components/StoreSettingsProvider";
import { getServerLocale } from "@/lib/locale";
import { splashScreens } from "@/lib/splashScreens";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { THEMES, themeCssVars } from "@/constants/themes";
import { toClientBrand } from "@/lib/brand";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { storeName, tagline, description, favicon } = await getSiteSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
    title: {
      default: tagline ? `${storeName} — ${tagline}` : storeName,
      template: `%s | ${storeName}`,
    },
    description,
    applicationName: storeName,
    appleWebApp: { capable: true, statusBarStyle: "default", title: storeName },
    // Next 16 only emits the standard `mobile-web-app-capable`; iOS still reads the
    // legacy apple tag to launch full-screen standalone, so emit it explicitly.
    other: { "apple-mobile-web-app-capable": "yes" },
    formatDetection: { telephone: false },
    icons: {
      icon: favicon
        ? [{ url: favicon.url }]
        : [{ url: "/favicon.png", type: "image/png", sizes: "96x96" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { theme } = await getSiteSettings();
  return {
    themeColor: THEMES[theme].primary,
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    viewportFit: "cover",
  };
}

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const locale = await getServerLocale();
  const settings = await getSiteSettings();

  return (
    <html
      lang={locale}
      className={poppins.variable}
      style={themeCssVars(settings.theme) as React.CSSProperties}
    >
      <head>
        {/* iOS launch images — not supported by Next's Metadata API, so the
            apple-touch-startup-image links are emitted manually. */}
        {splashScreens.map((s) => (
          <link key={s.href} rel="apple-touch-startup-image" media={s.media} href={s.href} />
        ))}
      </head>
      <body className="font-poppins antialiased overflow-x-hidden">
        <LocaleSync />
        <ServiceWorkerRegister />
        <StoreSettingsProvider currency={settings.currency} brand={toClientBrand(settings)}>
          {children}
        </StoreSettingsProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111827",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "14px",
              padding: "12px 16px",
            },
          }}
        />
      </body>
    </html>
  );
};
export default RootLayout;
```

- [ ] **Step 5: Reemplazar `app/(client)/layout.tsx`**

```tsx
import { headers } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientClerkProvider from "@/components/ClientClerkProvider";
import InstallPrompt from "@/components/InstallPrompt";

export default async function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Forward the CSP nonce (set by proxy.ts) to Clerk so its injected
  // scripts/styles carry it and aren't blocked by the policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <ClientClerkProvider nonce={nonce}>
      <div className="flex flex-col min-h-screen overflow-x-hidden">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <InstallPrompt />
      </div>
    </ClientClerkProvider>
  );
}
```

(Los metadatos viven ahora solo en `app/layout.tsx`.)

- [ ] **Step 6: Quitar `themeName` de store, carrito, pago y pedidos**

- `store.ts`: borrar `themeName: string;`, `setThemeName: (name: string) => void;`, `themeName: "emerald",` y `setThemeName: (name: string) => set({ themeName: name }),` (y el comentario `// theme` si queda solo).
- `app/(client)/cart/page.tsx`: borrar `themeName` del destructuring de `useStore()` y la línea `themeName,` del objeto de metadatos que se pasa a `createCheckoutSession`.
- `actions/createCheckoutSession.ts`: borrar `themeName?: string;` de `Metadata`, la línea `const themeName = metadata.themeName || "emerald";` y `themeName: themeName,` de `metadata`.
- `lib/orders.ts`: `type OrderMetadata = Metadata & { address?: string };`; borrar `themeName,` del destructuring y `themeName: themeName || "emerald",` del documento del pedido. (El argumento `themeName` de `sendOrderConfirmationEmail` se quita en Task 6.)
- `sanity/schemaTypes/orderType.ts`: en el campo `themeName` agregar `readOnly: true,` y `description: "Solo pedidos antiguos: la paleta ahora es de la tienda",`.

Run: `grep -rn "themeName\|setThemeName" --include=*.ts --include=*.tsx app components actions store.ts lib | grep -v "lib/email.ts\|lib/orders.ts:.*sendOrderConfirmationEmail\|update-status"`
Expected: sin salida (lo que queda en `lib/email.ts`, en la llamada de correo de `lib/orders.ts` y en `update-status` se cierra en Task 6).

- [ ] **Step 7: `public/offline.html` sin marca fija**

- `<title>Sin conexión · Ecom by Yeison</title>` → `<title>Sin conexión</title>`.
- Borrar el `<svg class="mark" ...>...</svg>` completo y la línea `<div class="logo">Ecom<span>by Yeison</span></div>`.

Run: `grep -c "Yeison" public/offline.html`
Expected: `0`

- [ ] **Step 8: Verificar**

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs && npx tsc --noEmit 2>&1 | grep "error TS" | grep -c "app/layout\|(client)/layout\|LocaleSync\|store.ts\|cart/page\|createCheckoutSession\|orderType"`
Expected: `check-permissions: ok` y `0`.

Con el servidor en 3000 (reiniciar): `curl -s http://localhost:3000/ | grep -o 'style="--color-shop_dark_green:[^;]*' | head -1` → muestra el color de la paleta guardada (`#063c28` para `emerald`); `curl -s http://localhost:3000/ | grep -o '<meta name="theme-color" content="[^"]*"'` → el mismo color.

En el navegador: poner a mano `localStorage.setItem("cart-store", JSON.stringify({state:{themeName:"sand"},version:0}))`, recargar y comprobar que la paleta sigue siendo la de la tienda.

- [ ] **Step 9: Commit**

```bash
git add constants/themes.ts scripts/check-permissions.mjs components/LocaleSync.tsx app/layout.tsx "app/(client)/layout.tsx" store.ts "app/(client)/cart/page.tsx" actions/createCheckoutSession.ts lib/orders.ts sanity/schemaTypes/orderType.ts public/offline.html
git commit -m "feat: una paleta por tienda (16 colores) y layouts con la configuración"
```

---

### Task 5: Pedidos del admin con roles

**Files:**
- Modify: `lib/permissions.ts`, `scripts/check-permissions.mjs`
- Create: `components/admin/OrdersTab.tsx`
- Modify: `components/admin/AdminButton.tsx`
- Modify: `app/(client)/admin/layout.tsx`, `app/(client)/api/admin/orders/route.ts`, `app/(client)/api/admin/orders/update-status/route.ts`
- Modify: `components/AdminOrdersList.tsx`
- Delete: `lib/admin.ts`

**Interfaces:**
- Consumes: `getActor()` (`lib/roles.ts`), `can(role, permission)`.
- Produces: `AdminTab` = `"tienda" | "marca" | "paginas" | "pedidos" | "usuarios"`.

- [ ] **Step 1: Prueba que falla**

En `scripts/check-permissions.mjs` reemplazar el bloque `// Admin tabs` por:

```js
// Admin tabs
assert.deepEqual(adminTabs("superadmin"), ["tienda", "marca", "paginas", "pedidos", "usuarios"]);
assert.deepEqual(adminTabs("admin"), ["tienda", "marca", "paginas", "pedidos", "usuarios"]);
assert.deepEqual(adminTabs("empleado"), ["pedidos"]);
assert.deepEqual(adminTabs("cliente"), []);
```

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs 2>&1 | grep -m1 "AssertionError\|ok"`
Expected: `AssertionError`.

- [ ] **Step 2: `lib/permissions.ts`**

`export type AdminTab = "tienda" | "marca" | "paginas" | "pedidos" | "usuarios";` y:

```ts
const TAB_PERMISSION: Record<AdminTab, Permission> = {
  tienda: "configurar",
  marca: "configurar",
  paginas: "configurar",
  pedidos: "pedidos",
  usuarios: "asignarEmpleado",
};
```

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs`
Expected: `check-permissions: ok`

- [ ] **Step 3: Crear `components/admin/OrdersTab.tsx`**

```tsx
"use client";

import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Temporary entry point until part 2 moves order management inside the panel.
const OrdersTab = () => (
  <div className="flex flex-col gap-3">
    <h3 className="font-bold text-gray-900 text-sm">Pedidos</h3>
    <p className="text-sm text-gray-600">Revisa los pedidos de la tienda y cambia su estado.</p>
    <DialogPrimitive.Close asChild>
      <Link
        href="/admin/orders"
        className="self-start bg-shop_dark_green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90"
      >
        Abrir pedidos
      </Link>
    </DialogPrimitive.Close>
  </div>
);

export default OrdersTab;
```

- [ ] **Step 4: `components/admin/AdminButton.tsx`**

Agregar `import OrdersTab from "./OrdersTab";`, en `TAB_LABELS` `pedidos: "Pedidos",` (después de `paginas`), y después de la línea de `PagesTab`:

```tsx
            {active === "pedidos" && <OrdersTab />}
```

- [ ] **Step 5: Proteger página y API con el permiso `pedidos`**

`app/(client)/admin/layout.tsx`:

```tsx
import { notFound } from "next/navigation";
import React from "react";
import { getActor } from "@/lib/roles";
import { can } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor || !can(actor.role, "pedidos")) notFound();
  return <>{children}</>;
}
```

En `app/(client)/api/admin/orders/route.ts` y `.../update-status/route.ts`:
- reemplazar los imports `currentUser` e `isAdminEmail` por `import { getActor } from "@/lib/roles";` y `import { can } from "@/lib/permissions";`;
- reemplazar el bloque que lee `user`/`userEmail` y comprueba `isAdminEmail` por:

```ts
    const actor = await getActor();
    if (!actor || !can(actor.role, "pedidos")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
```

En `route.ts` (GET) leer sin CDN, para ver siempre el estado real:

```ts
    const orders = await backendClient.fetch(GET_ALL_ORDERS_QUERY, {}, { useCdn: false });
```

En `update-status/route.ts` agregar `{ useCdn: false }` como tercer argumento al `backendClient.fetch` de `orderBefore`.

Borrar `lib/admin.ts`:

```bash
git rm -q lib/admin.ts
```

Run: `grep -rn "isAdminEmail\|lib/admin\|ADMIN_EMAILS" --include=*.ts --include=*.tsx . | grep -v node_modules | wc -l`
Expected: `0`

- [ ] **Step 6: `components/AdminOrdersList.tsx` sin depuración**

Cambiar el import `useState, useEffect, useRef` por `useState, useEffect, useCallback`. Borrar `isUpdatingRef`, `updateTimeoutRef`, `pollingIntervalRef` y reemplazar `fetchOrders` + el `useEffect` de montaje por:

```tsx
  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch orders");
      setOrders(await response.json());
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // ponytail: 10 s polling; switch to Sanity listen() if admins need instant updates.
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);
```

Reemplazar `handleStatusChange` completa por:

```tsx
  // The API answers with the saved order and reads without CDN, so no verification refetch is needed.
  const handleStatusChange = (updatedOrder: Order) => {
    setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
    if (filter !== "all" && updatedOrder.status !== filter) setFilter("all");
    setIsModalOpen(false);
    setSelectedOrder(null);
  };
```

Run: `grep -c "console.log" components/AdminOrdersList.tsx`
Expected: `0`

- [ ] **Step 7: Verificar**

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs && npx tsc --noEmit 2>&1 | grep "error TS" | grep -c "permissions\|OrdersTab\|AdminButton\|admin/layout\|api/admin\|AdminOrdersList"`
Expected: `check-permissions: ok` y `0`.

Con el servidor en 3000 y sin sesión:
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/admin/orders; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/orders`
Expected: `403` y `404`.

- [ ] **Step 8: Commit**

```bash
git add lib/permissions.ts scripts/check-permissions.mjs components/admin/OrdersTab.tsx components/admin/AdminButton.tsx "app/(client)/admin/layout.tsx" "app/(client)/api/admin/orders" components/AdminOrdersList.tsx
git commit -m "feat: pedidos del admin protegidos por roles y pestaña Pedidos en el panel"
```

---

### Task 6: Correos con la marca de la tienda

**Files:**
- Modify: `lib/email.ts`, `lib/orders.ts`, `app/(client)/api/admin/orders/update-status/route.ts`, `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: `getSiteSettings()`, `THEMES`, `formatPrice`, `urlFor`.
- Produces:
  - `sendOrderConfirmationEmail(customerEmail, customerName, orderNumber, totalPrice, products, invoiceUrl?, currency?: string)`. `currency` va en mayúsculas, por defecto `"USD"`.
  - `sendInvoiceEmail(email, customerName, orderNumber, invoiceUrl, invoiceNumber)`, sin `themeName`.

- [ ] **Step 1: Prueba (montos en COP desde Stripe)**

Agregar al script de chequeo, antes de `console.log(...)`:

```js
// Stripe sends lowercase currency codes; emails format them in uppercase.
assert.equal(nbsp(formatPrice(1250000, "cop".toUpperCase())), "$ 1.250.000");
assert.equal(formatPrice(1250000, "cop"), "$1,250,000.00"); // lowercase falls back to USD: callers must uppercase
```

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs`
Expected: `check-permissions: ok` (documenta la regla que siguen los correos).

- [ ] **Step 2: `lib/email.ts`**

1. Borrar `THEME_COLORS` completo, su comentario y `getThemeColors`. Agregar debajo del `transporter`:

```ts
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { THEMES } from "@/constants/themes";
import { formatPrice } from "@/constants/currencies";

// Store name and palette for emails. getSiteSettings never throws: neutral defaults if Sanity is down.
async function emailBrand() {
  const { storeName, theme } = await getSiteSettings();
  const { primary, light, accent, bg } = THEMES[theme];
  return { storeName, theme: { primary, light, accent, bg } };
}
```

(Los `import` van arriba del archivo, junto a `nodemailer`.)

2. `sendOrderConfirmationEmail`: cambiar el último parámetro `themeName?: string` por `currency = "USD"` y la línea `const theme = getThemeColors(themeName);` por `const { storeName, theme } = await emailBrand();`. Dentro de la función:
   - `$${p.price.toFixed(2)}` → `${formatPrice(p.price, currency)}`;
   - las dos `$${totalPrice.toFixed(2)}` → `${formatPrice(totalPrice, currency)}`;
   - `&copy; 2026 Ecom by Yeison.` → `&copy; ${new Date().getFullYear()} ${storeName}.`;
   - asunto `` `Confirmación de Pedido #${orderNumber} - Ecom by Yeison` `` → `` `Confirmación de Pedido #${orderNumber} - ${storeName}` ``.
3. `sendInvoiceEmail`: quitar el parámetro `themeName?: string`; `const theme = getThemeColors(themeName);` → `const { storeName, theme } = await emailBrand();`; `Agradecemos tu preferencia en Ecom by Yeison.` → `Agradecemos tu preferencia en ${storeName}.`; `&copy; 2026 Ecom by Yeison.` → `&copy; ${new Date().getFullYear()} ${storeName}.`; asunto `- Ecom by Yeison` → `- ${storeName}`.

Run: `grep -c "Yeison\|toFixed\|THEME_COLORS\|themeName" lib/email.ts`
Expected: `0`

- [ ] **Step 3: `lib/orders.ts` — foto y moneda**

Agregar `import { urlFor } from "@/sanity/lib/image";`. Reemplazar la consulta y el armado de la URL de la foto:

```ts
      const sanityProduct = await backendClient.fetch(
        `*[_id == $productId][0]{ "image": images[0] }`,
        { productId }
      );
      if (sanityProduct?.image?.asset) {
        productImage = urlFor(sanityProduct.image).width(300).height(300).fit("crop").url();
      }
```

En la llamada a `sendOrderConfirmationEmail(...)` reemplazar el último argumento `themeName` por `(session.currency ?? "usd").toUpperCase()`.

- [ ] **Step 4: `update-status/route.ts`**

Quitar `themeName` de la proyección `{ email, customerName, orderNumber, themeName, invoice }` y el argumento `orderBefore.themeName` de `sendInvoiceEmail(...)`.

- [ ] **Step 5: Verificar**

Run: `grep -rn "themeName" --include=*.ts --include=*.tsx app components actions lib store.ts | grep -v "sanity.types" | wc -l; npx tsc --noEmit 2>&1 | grep "error TS" | grep -c "lib/email\|lib/orders\|update-status"`
Expected: `0` y `0`.

- [ ] **Step 6: Commit**

```bash
git add lib/email.ts lib/orders.ts "app/(client)/api/admin/orders/update-status/route.ts" scripts/check-permissions.mjs
git commit -m "feat: correos con nombre, paleta y moneda de la tienda y foto del producto"
```

---

### Task 7: App instalable con la marca de la tienda y scripts

**Files:**
- Modify: `app/manifest.ts`, `package.json`, `scripts/gen-icons.mjs`, `lib/splashScreens.ts`
- Delete: `scripts/generate-icons.mjs`, `scripts/brand-offline.mjs`

**Interfaces:**
- Consumes: `getSiteSettings()`, `THEMES`.

- [ ] **Step 1: `app/manifest.ts` desde la configuración**

```ts
import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { THEMES } from "@/constants/themes";

// Served at /manifest.webmanifest. Name and colors come from the store settings;
// icons are static files regenerated per client with `npm run icons`.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { storeName, description, theme } = await getSiteSettings();
  const palette = THEMES[theme];
  return {
    name: storeName,
    short_name: storeName.length > 12 ? storeName.slice(0, 12) : storeName,
    description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: palette.bg,
    theme_color: palette.primary,
    // "any" so the installed app isn't locked to portrait on tablet/desktop.
    orientation: "any",
    lang: "es",
    categories: ["shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 2: Scripts**

En `package.json` → `scripts`:
- `"icons": "node scripts/gen-icons.mjs",`
- borrar la línea `"splash": ...` (su generador no existe);
- `"lint": "eslint .",`

Agregar al inicio de `scripts/gen-icons.mjs`:

```js
// Generates the PWA icons and favicon.png from public/logo.svg (replace it with each client's logo).
// Requires sharp, which is not a project dependency: run `npm i --no-save sharp` first.
```

En `lib/splashScreens.ts` cambiar el comentario `// AUTOGENERADO por scripts/generate-splash.mjs — no editar a mano.` por `// Splash screens generated once for the current images in public/splash; regenerate per client if the brand changes.`

```bash
git rm -q scripts/generate-icons.mjs scripts/brand-offline.mjs
```

- [ ] **Step 3: Verificar**

Run: `curl -s http://localhost:3000/manifest.webmanifest | head -c 300; echo; npm run lint 2>&1 | tail -3`
Expected: JSON con `"name":"Ecom by Yeison"` y `"theme_color":"#063c28"` (paleta emerald); `lint` corre (puede listar avisos; no debe fallar por "command not found" ni por `next lint`).

- [ ] **Step 4: Commit**

```bash
git add app/manifest.ts package.json scripts/gen-icons.mjs lib/splashScreens.ts
git commit -m "feat: app instalable con nombre y colores de la tienda; scripts corregidos"
```

---

### Task 8: Build limpio y verificación final

**Files:** los que señale `npm run build`.

- [ ] **Step 1: Build**

Detener el servidor de desarrollo (libera memoria y `.next`).

Run: `npm run build 2>&1 | tail -40`
Expected: `✓ Compiled successfully` y sin `Type error`. Si hay errores, corregir cada uno en su causa (no con `any` ni `@ts-ignore` salvo tipos de terceros rotos, y en ese caso con comentario `ponytail:`), ledger como ruling, y repetir hasta que pase.

- [ ] **Step 2: Suite**

Run: `npm run check:permissions && npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `check-permissions: ok` y `0`.

- [ ] **Step 3: Recorrido manual (con el usuario, servidor en 3000)**

1. Panel: Tienda (elegir una de las paletas nuevas y volver a la original), moneda, Marca (cambiar y restaurar el nombre), Páginas (abrir una página), Usuarios (lista carga).
2. Botón ES/EN: encabezado, pie, títulos de páginas, filtros de precio y Newsletter cambian juntos; nombre, banner y contacto no cambian.
3. Búsqueda: `/search?query=` con un producto existente devuelve resultados.
4. Iniciar sesión con el modal (el usuario escribe su contraseña).
5. Empleado (si el usuario tiene una cuenta): panel con solo "Pedidos"; "Abrir pedidos" lleva a `/admin/orders` y cambia un estado. Cliente o sin sesión: `/admin/orders` da 404.
6. Consola del navegador en inicio, tienda y producto: sin bloqueos de CSP; imágenes de `cdn.sanity.io` visibles.
7. Si el usuario agregó `STRIPE_SECRET_KEY`: compra de prueba con tarjeta de prueba de Stripe; el pedido aparece una vez en "Mis pedidos" y en `/admin/orders`.

- [ ] **Step 4: Commit (si hubo correcciones)**

```bash
git add -A
git commit -m "fix: build limpio con Next 16"
```
