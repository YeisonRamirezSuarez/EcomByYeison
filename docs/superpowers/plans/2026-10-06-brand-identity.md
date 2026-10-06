# Parte 1c — Identidad de marca por tienda — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada tienda configure su identidad (nombre, logo, favicon, banner, contacto, redes y páginas de contenido) desde el panel, con valores neutros para tiendas nuevas y Ecom by Yeison guardado como primer cliente; el Newsletter del pie guarda suscriptores.

**Architecture:** Toda la identidad vive en el documento único `siteSettings` de Sanity. Reglas puras (`lib/validation.ts`, `lib/brand.ts`, `constants/brandDefaults.ts`) se prueban con el script de chequeo y se usan igual en el navegador y en el servidor. `getSiteSettings()` lee todo una vez y rellena lo que falta con `withDefaults`; los componentes de servidor leen de ahí y los de cliente (logo, redes) desde `StoreSettingsProvider`. El panel guarda con acciones de servidor que validan permiso `configurar` y revalidan la etiqueta `siteSettings`.

**Tech Stack:** Next.js 15.5 (App Router, server actions, `generateMetadata`), React 19, Clerk 6.39, Sanity (`next-sanity`, `@sanity/client`), Tailwind v4, `lucide-react`, `react-icons/fa6`, `react-hot-toast`, Node 22 (`--experimental-strip-types`, `--env-file`).

**Spec:** `docs/superpowers/specs/2026-10-06-brand-identity-design.md`

## Global Constraints

- Textos de interfaz en español. Nada nuevo en inglés.
- Sin dependencias nuevas (`@sanity/client` ya está instalado como dependencia de `next-sanity`).
- `lib/validation.ts`, `lib/brand.ts` y `constants/brandDefaults.ts` solo pueden tener `import type` (el script de chequeo los carga con Node sin resolver alias ni extensiones).
- Documento Sanity `siteSettings` con `_id` fijo `siteSettings`; etiqueta de caché `siteSettings`.
- Regla de relleno: campo ausente o `null` en Sanity toma el valor neutro; campo guardado se respeta tal cual, incluso `""` o `[]`; objetos campo por campo.
- Imágenes de marca: JPG, PNG, WEBP o SVG; máx. 4 MB. Mensaje: "Solo JPG, PNG, WEBP o SVG de hasta 4 MB".
- Enlaces (`href`): ruta que empieza por `/` (no `//` ni `/\`) o URL `https://`; máx. 300.
- Redes: `facebook`, `instagram`, `tiktok`, `youtube`, `linkedin`, `x`, `whatsapp`, `pinterest`; cada una URL `https://`.
- Páginas: `about`, `terms`, `privacy`, `faqs`, `help`; máx. 20 bloques; 15 íconos.
- Pestañas del panel en orden: `tienda`, `marca`, `paginas`, `usuarios`; `marca` y `paginas` exigen `configurar`.
- Toda acción de administración valida permiso en el servidor; `subscribe` es pública.
- Valores neutros sin "Yeison", sin país, sin moneda.
- Servidor de desarrollo: antes de iniciarlo, detener lo que ocupe el puerto 3000 (y 3001); correr solo en 3000.
- Línea base de TypeScript: `npx tsc --noEmit` da 9 errores previos (app/ ×5, HomeCategories, ProductCard, ShopByBrands, lib/stripe). Criterio: ningún error nuevo.

## Review Focus

1. Contenido editado en Sanity Studio (sin pasar por la validación del panel) con `href` `javascript:...`, ícono desconocido o red `http://`: la tienda no debe pintar enlaces peligrosos ni romperse. Guardas en `ContentBlocks`, `HomeBanner` y `SocialMedia` (Tasks 4 y 5) usando `isValidHref`/`isHttpsUrl` probadas en Task 1.
2. `siteSettings` existente pero parcial (hoy solo tiene `currency`), o con tipos incorrectos, o con imagen cuyo asset fue borrado (`url: null`): la tienda muestra valores neutros sin error. Probado en Task 2 (`withDefaults`).
3. Acción llamada directamente por alguien sin permiso o con datos fabricados (sección desconocida, `pageKey` `"__proto__"`, `assetId` inexistente): se rechaza sin escribir. `requirePermission`, lista blanca de `PAGE_KEYS` y `assertImagesExist` (Task 8); prueba manual en Task 10.
4. Suscripción repetida con mayúsculas o espacios distintos (`" Ana@Mail.COM "` y `"ana@mail.com"`): un solo documento. `validateSubscription` normaliza (probado en Task 1) y el `_id` sale del correo normalizado (Task 6).
5. Claves de bloque repetidas o con caracteres raros enviadas al servidor: se guardan claves únicas y válidas para Sanity. Probado en Task 1 (`validatePage`).

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `lib/validation.ts` (nuevo) | Constantes (`PAGE_KEYS`, `SOCIAL_KEYS`, `CONTENT_ICONS`, límites, mensajes) y validadores puros de identidad, banner, contacto, redes, páginas, imágenes y suscripción. |
| `lib/brand.ts` (nuevo) | Tipos de la identidad (`Brand`, `BannerSettings`, ...), `withDefaults`, `ClientBrand`, `toClientBrand`. |
| `constants/brandDefaults.ts` (nuevo) | `BRAND_DEFAULTS`: valores neutros de una tienda nueva. |
| `sanity/queries/siteSettings.ts` | Consulta ampliada; `SiteSettings = { theme; currency } & Brand`. |
| `sanity/schemaTypes/siteSettingsType.ts` | Campos nuevos para Studio. |
| `sanity/schemaTypes/subscriberType.ts` (nuevo) | Tipo "Suscriptor". |
| `components/StoreSettingsProvider.tsx` | Contexto de moneda + `useBrand()` (logo y redes). |
| `components/Logo.tsx`, `SocialMedia.tsx`, `HomeBanner.tsx`, `Header.tsx`, `Footer.tsx`, `FooterTop.tsx` | Leen la configuración. |
| `components/ContactForm.tsx` (nuevo) | Formulario `mailto:`. |
| `components/contentIcons.ts` (nuevo) | Mapa clave → ícono lucide. |
| `components/ContentBlocks.tsx` (nuevo) | Dibuja introducción y bloques de una página. |
| `components/NewsletterForm.tsx` (nuevo), `actions/newsletter.ts` (nuevo) | Suscripción. |
| `lib/actionResult.ts` (nuevo) | `ActionResult` y `run()` movidos desde `actions/admin.ts`. |
| `actions/brand.ts` (nuevo) | `saveBrandSection`, `savePage`, `uploadImage`. |
| `components/admin/brand/*` (nuevos) | Pestaña Marca: `BrandTab`, `fields.tsx`, `ImageField`, 4 secciones. |
| `components/admin/pages/*` (nuevos) | Pestaña Páginas: `PagesTab`, `BlockEditor`. |
| `scripts/seed-ecom-by-yeison.mjs` (nuevo) | Guarda Ecom by Yeison como configuración. |

---

### Task 0: Rama

- [ ] **Step 1: Crear la rama desde la parte 1 (aún sin fusionar)**

```bash
git checkout feature/roles-admin-panel
git checkout -b feature/brand-identity
```

Expected: `Switched to a new branch 'feature/brand-identity'`.

---

### Task 1: Tipos de marca y reglas de validación (puras)

**Files:**
- Create: `lib/brand.ts` (solo tipos en esta tarea)
- Create: `lib/validation.ts`
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Produces (`lib/brand.ts`): tipos `ImageValue = { assetId: string; url: string }`, `Cta = { label; href }`, `Stat = { _key; value; label }`, `BannerSettings`, `ContactSettings`, `SocialSettings = Record<SocialKey, string>`, `ContentBlock = { _key; icon: ContentIconKey; title; text; href }`, `PageContent = { intro: string; blocks: ContentBlock[] }`, `IdentitySettings`, `Brand`, `BrandSection = "identity" | "banner" | "contact" | "social"`.
- Produces (`lib/validation.ts`): `ValidationResult<T>`, `PAGE_KEYS`, `PageKey`, `PAGE_LABELS`, `SOCIAL_KEYS`, `SocialKey`, `SOCIAL_LABELS`, `CONTENT_ICONS`, `ContentIconKey`, `isContentIcon`, `BRAND_IMAGE_TYPES`, `MAX_IMAGE_BYTES`, `IMAGE_ERROR`, `INVALID_FORM`, `MAX_BLOCKS`, `MAX_STATS`, `isHttpsUrl`, `isValidHref`, `isEmail`, `validateImageFile(file, allowed?) => string | null`, `validateIdentity`, `validateBanner`, `validateContact`, `validateSocial`, `validatePage`, `validateSubscription` (todas `(input: unknown) => ValidationResult<...>`).

- [ ] **Step 1: Escribir las pruebas que fallan**

Agregar al final de `scripts/check-permissions.mjs`, antes de `console.log("check-permissions: ok");`:

```js
// Brand validation
const v = await import("../lib/validation.ts");
assert.equal(v.isValidHref("/shop"), true);
assert.equal(v.isValidHref("//evil.com"), false);
assert.equal(v.isValidHref("/\\evil.com"), false);
assert.equal(v.isValidHref("https://x.com"), true);
assert.equal(v.isValidHref("http://x.com"), false);
assert.equal(v.isValidHref("javascript:alert(1)"), false);
assert.equal(v.isValidHref(""), false);
assert.equal(v.isValidHref("/" + "a".repeat(300)), false);
assert.equal(v.isHttpsUrl("https://wa.me/573000000000"), true);
assert.equal(v.isHttpsUrl("http://x.com"), false);
assert.equal(v.isHttpsUrl("no es url"), false);
assert.equal(v.isEmail("a@b.co"), true);
assert.equal(v.isEmail("a@b"), false);
assert.equal(v.isEmail("a b@c.co"), false);

const MB4 = 4 * 1024 * 1024;
for (const type of ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]) {
  assert.equal(v.validateImageFile({ type, size: 1000 }), null, type);
}
assert.equal(v.validateImageFile({ type: "application/pdf", size: 1000 }), v.IMAGE_ERROR);
assert.equal(v.validateImageFile({ type: "image/png", size: MB4 }), null);
assert.equal(v.validateImageFile({ type: "image/png", size: MB4 + 1 }), v.IMAGE_ERROR);
assert.equal(v.validateImageFile({ type: "image/png", size: 0 }), v.IMAGE_ERROR);
assert.equal(v.IMAGE_ERROR, "Solo JPG, PNG, WEBP o SVG de hasta 4 MB");

const img = {
  assetId: "image-abc123-200x100-png",
  url: "https://cdn.sanity.io/images/p/d/abc123-200x100.png",
};
const identity = {
  storeName: "  Nike  ",
  tagline: "",
  description: "",
  logoType: "text",
  logoText: "Nike",
  logoSubtext: "",
  logoImage: null,
  favicon: null,
};
const okIdentity = v.validateIdentity(identity);
assert.equal(okIdentity.ok, true);
assert.equal(okIdentity.value.storeName, "Nike");
assert.equal(v.validateIdentity({ ...identity, storeName: "" }).errors.storeName, "Campo obligatorio");
assert.equal(
  v.validateIdentity({ ...identity, storeName: "a".repeat(61) }).errors.storeName,
  "Máximo 60 caracteres"
);
assert.equal(v.validateIdentity({ ...identity, storeName: "a".repeat(60) }).ok, true);
assert.equal(v.validateIdentity({ ...identity, logoText: "" }).errors.logoText, "Campo obligatorio");
assert.equal(
  v.validateIdentity({ ...identity, logoType: "image" }).errors.logoImage,
  "Sube una imagen para el logo"
);
assert.equal(
  v.validateIdentity({ ...identity, logoType: "image", logoText: "", logoImage: img }).ok,
  true
);
assert.equal(v.validateIdentity({ ...identity, logoType: "otro" }).errors.logoType, "Elige texto o imagen");
assert.equal(
  v.validateIdentity({ ...identity, favicon: { assetId: "x", url: "javascript:1" } }).errors.favicon,
  "Imagen inválida"
);
assert.equal(v.validateIdentity(null).ok, false);

const banner = {
  badge: "",
  title: "Hasta",
  highlight: "50% OFF",
  subtitle: "",
  description: "",
  primaryCta: { label: "Comprar", href: "/shop" },
  secondaryCta: { label: "", href: "" },
  image: null,
  stats: [],
};
const HREF_ERROR = "Usa una ruta que empiece por / o un enlace https://";
assert.equal(v.validateBanner(banner).ok, true);
assert.equal(
  v.validateBanner({ ...banner, primaryCta: { label: "Comprar", href: "" } }).errors["primaryCta.href"],
  "Campo obligatorio"
);
assert.equal(
  v.validateBanner({ ...banner, primaryCta: { label: "Comprar", href: "javascript:alert(1)" } })
    .errors["primaryCta.href"],
  HREF_ERROR
);
const stat = (k) => ({ _key: k, value: "24/7", label: "Soporte" });
assert.equal(v.validateBanner({ ...banner, stats: [stat("a"), stat("b"), stat("c")] }).ok, true);
assert.equal(
  v.validateBanner({ ...banner, stats: [stat("a"), stat("b"), stat("c"), stat("d")] }).errors.stats,
  "Máximo 3 cifras"
);
assert.equal(
  v.validateBanner({ ...banner, stats: [{ _key: "a", value: "", label: "x" }] }).errors["stats.0.value"],
  "Campo obligatorio"
);

assert.equal(v.validateContact({ email: "", phone: "", address: "", hours: "" }).ok, true);
assert.equal(v.validateContact({ email: "malo" }).errors.email, "Correo inválido");
assert.equal(v.validateContact({ phone: "1".repeat(81) }).errors.phone, "Máximo 80 caracteres");
assert.deepEqual(Object.keys(v.validateSocial({}).value), [
  "facebook", "instagram", "tiktok", "youtube", "linkedin", "x", "whatsapp", "pinterest",
]);
assert.equal(
  v.validateSocial({ instagram: "http://instagram.com/x" }).errors.instagram,
  "Debe ser un enlace https://"
);
assert.equal(v.validateSocial({ whatsapp: "https://wa.me/573000000000" }).ok, true);

const block = (i) => ({ _key: `b${i}`, icon: "truck", title: `Bloque ${i}`, text: "", href: "" });
const many = (n) => Array.from({ length: n }, (_, i) => block(i));
assert.equal(v.validatePage({ intro: "", blocks: many(20) }).ok, true);
assert.equal(v.validatePage({ intro: "", blocks: many(21) }).errors.blocks, "Máximo 20 bloques");
assert.equal(v.validatePage({ blocks: [{ ...block(0), title: "" }] }).errors["blocks.0.title"], "Campo obligatorio");
assert.equal(v.validatePage({ blocks: [{ ...block(0), icon: "bomba" }] }).errors["blocks.0.icon"], "Ícono inválido");
assert.equal(v.validatePage({ blocks: [{ ...block(0), icon: "toString" }] }).errors["blocks.0.icon"], "Ícono inválido");
assert.equal(
  v.validatePage({ blocks: [{ ...block(0), href: "javascript:alert(1)" }] }).errors["blocks.0.href"],
  HREF_ERROR
);
const keyed = v.validatePage({
  blocks: [{ ...block(0), _key: "dup" }, { ...block(1), _key: "dup" }, { ...block(2), _key: "<script>" }],
});
assert.equal(keyed.ok, true);
assert.equal(new Set(keyed.value.blocks.map((b) => b._key)).size, 3);
assert.ok(keyed.value.blocks.every((b) => /^[a-zA-Z0-9_-]{1,40}$/.test(b._key)));
assert.equal(v.validatePage({ intro: "a".repeat(2001) }).errors.intro, "Máximo 2000 caracteres");

assert.deepEqual(v.validateSubscription({ email: "  Ana@Mail.COM ", consent: true }), {
  ok: true,
  value: { email: "ana@mail.com" },
});
assert.equal(
  v.validateSubscription({ email: "ana@mail.com", consent: false }).errors.consent,
  "Debes aceptar para suscribirte"
);
assert.equal(
  v.validateSubscription({ email: "ana@mail.com", consent: "true" }).errors.consent,
  "Debes aceptar para suscribirte"
);
assert.equal(v.validateSubscription({ email: "nada", consent: true }).errors.email, "Ingresa un correo válido");
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run check:permissions`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` para `lib/validation.ts`.

- [ ] **Step 3: Crear `lib/brand.ts` (tipos)**

```ts
// Store identity types. Only type imports: also run by scripts/check-permissions.mjs.
import type { ContentIconKey, PageKey, SocialKey } from "./validation";

export type ImageValue = { assetId: string; url: string };
export type Cta = { label: string; href: string };
export type Stat = { _key: string; value: string; label: string };

export type BannerSettings = {
  badge: string;
  title: string;
  highlight: string;
  subtitle: string;
  description: string;
  primaryCta: Cta;
  secondaryCta: Cta;
  image: ImageValue | null;
  stats: Stat[];
};

export type ContactSettings = { email: string; phone: string; address: string; hours: string };
export type SocialSettings = Record<SocialKey, string>;

export type ContentBlock = {
  _key: string;
  icon: ContentIconKey;
  title: string;
  text: string;
  href: string;
};
export type PageContent = { intro: string; blocks: ContentBlock[] };

export type IdentitySettings = {
  storeName: string;
  tagline: string;
  description: string;
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
```

- [ ] **Step 4: Crear `lib/validation.ts`**

```ts
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
    typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
```

- [ ] **Step 5: Correr y ver que pasa**

Run: `npm run check:permissions`
Expected: `check-permissions: ok`

- [ ] **Step 6: Commit**

```bash
git add lib/brand.ts lib/validation.ts scripts/check-permissions.mjs
git commit -m "feat: reglas de validación de la identidad de marca"
```

---

### Task 2: Valores neutros y relleno (`withDefaults`)

**Files:**
- Create: `constants/brandDefaults.ts`
- Modify: `lib/brand.ts` (agregar `withDefaults`)
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Consumes: tipos de `lib/brand.ts`, validadores de Task 1.
- Produces: `BRAND_DEFAULTS: Brand` (`constants/brandDefaults.ts`); `withDefaults(raw: unknown, defaults: Brand): Brand` (`lib/brand.ts`).

- [ ] **Step 1: Escribir las pruebas que fallan**

Agregar al final de `scripts/check-permissions.mjs`, antes de `console.log(...)`:

```js
// Brand defaults
const { withDefaults } = await import("../lib/brand.ts");
const { BRAND_DEFAULTS } = await import("../constants/brandDefaults.ts");
assert.equal(BRAND_DEFAULTS.storeName, "Mi tienda");
assert.equal(JSON.stringify(BRAND_DEFAULTS).toLowerCase().includes("yeison"), false);
assert.equal(v.validateIdentity(BRAND_DEFAULTS).ok, true);
assert.equal(v.validateBanner(BRAND_DEFAULTS.banner).ok, true);
assert.equal(v.validateContact(BRAND_DEFAULTS.contact).ok, true);
assert.equal(v.validateSocial(BRAND_DEFAULTS.social).ok, true);
for (const key of v.PAGE_KEYS) {
  assert.equal(v.validatePage(BRAND_DEFAULTS.pages[key]).ok, true, key);
  assert.ok(BRAND_DEFAULTS.pages[key].blocks.length > 0, key);
}

assert.deepEqual(withDefaults(null, BRAND_DEFAULTS), BRAND_DEFAULTS);
assert.deepEqual(withDefaults({}, BRAND_DEFAULTS), BRAND_DEFAULTS);
assert.deepEqual(withDefaults({ currency: "USD" }, BRAND_DEFAULTS), BRAND_DEFAULTS);

const partial = withDefaults({ storeName: "Nike", contact: { email: "hola@nike.com" } }, BRAND_DEFAULTS);
assert.equal(partial.storeName, "Nike");
assert.equal(partial.contact.email, "hola@nike.com");
assert.equal(partial.contact.phone, BRAND_DEFAULTS.contact.phone);
assert.deepEqual(partial.banner, BRAND_DEFAULTS.banner);

const kept = withDefaults(
  { tagline: "", contact: { phone: "" }, pages: { faqs: { blocks: [] } } },
  BRAND_DEFAULTS
);
assert.equal(kept.tagline, "");
assert.equal(kept.contact.phone, "");
assert.deepEqual(kept.pages.faqs.blocks, []);
assert.equal(kept.pages.faqs.intro, BRAND_DEFAULTS.pages.faqs.intro);
assert.deepEqual(kept.pages.about, BRAND_DEFAULTS.pages.about);

const wrong = withDefaults(
  { storeName: 5, banner: "x", pages: { about: { blocks: "x" } } },
  BRAND_DEFAULTS
);
assert.equal(wrong.storeName, "Mi tienda");
assert.deepEqual(wrong.banner, BRAND_DEFAULTS.banner);
assert.deepEqual(wrong.pages.about.blocks, BRAND_DEFAULTS.pages.about.blocks);

assert.equal(
  withDefaults({ logoImage: { assetId: "image-a-1x1-png", url: null } }, BRAND_DEFAULTS).logoImage,
  null
);
assert.deepEqual(withDefaults({ logoImage: img }, BRAND_DEFAULTS).logoImage, img);

const extra = withDefaults(JSON.parse('{"__proto__": {"polluted": true}, "hack": 1}'), BRAND_DEFAULTS);
assert.equal(extra.hack, undefined);
assert.equal({}.polluted, undefined);

const full = {
  ...BRAND_DEFAULTS,
  storeName: "Adidas",
  logoImage: img,
  favicon: img,
  banner: { ...BRAND_DEFAULTS.banner, image: img },
};
assert.deepEqual(withDefaults(full, BRAND_DEFAULTS), full);
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run check:permissions`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` para `constants/brandDefaults.ts` (o `withDefaults is not a function`).

- [ ] **Step 3: Crear `constants/brandDefaults.ts`**

```ts
// Neutral identity of a brand-new store. No brand, country or currency on purpose.
// Only type imports: also run by scripts/check-permissions.mjs.
import type { Brand, ContentBlock } from "../lib/brand";

const block = (
  _key: string,
  icon: ContentBlock["icon"],
  title: string,
  text: string,
  href = ""
): ContentBlock => ({ _key, icon, title, text, href });

export const BRAND_DEFAULTS: Brand = {
  storeName: "Mi tienda",
  tagline: "Tu tienda en línea",
  description:
    "Encuentra los mejores productos con envíos seguros y atención personalizada.",
  logoType: "text",
  logoText: "Mi tienda",
  logoSubtext: "",
  logoImage: null,
  favicon: null,
  banner: {
    badge: "Novedades",
    title: "Descubre",
    highlight: "lo nuevo",
    subtitle: "en nuestra tienda",
    description: "Explora nuestro catálogo y encuentra lo que buscas.",
    primaryCta: { label: "Comprar ahora", href: "/shop" },
    secondaryCta: { label: "Ver ofertas", href: "/deal" },
    image: null,
    stats: [],
  },
  contact: { email: "", phone: "", address: "", hours: "" },
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
      blocks: [
        block("envios", "truck", "Envíos", "Enviamos tus pedidos de forma rápida y segura."),
        block("seguro", "shield-check", "Compra segura", "Tus datos y pagos están protegidos."),
        block("soporte", "headset", "Atención al cliente", "Estamos aquí para ayudarte."),
        block("calidad", "star", "Calidad", "Seleccionamos cada producto con cuidado."),
      ],
    },
    terms: {
      intro: "",
      blocks: [
        block("uso", "file-text", "1. Uso del sitio", "Al usar este sitio aceptas estos términos y condiciones."),
        block("precios", "file-text", "2. Productos y precios", "Los precios, la disponibilidad y las descripciones pueden cambiar sin previo aviso."),
        block("pagos", "credit-card", "3. Pagos", "Los pagos se procesan de forma segura a través de Stripe. No almacenamos datos de tarjetas."),
        block("devoluciones", "rotate-ccw", "4. Devoluciones", "Consulta las condiciones de devolución con nuestro equipo antes de enviar un producto."),
        block("contacto", "mail", "5. Contacto", "Si tienes dudas sobre estos términos, escríbenos desde la página de contacto."),
      ],
    },
    privacy: {
      intro: "",
      blocks: [
        block("datos", "user-check", "1. Información que recopilamos", "Recopilamos tu nombre, correo y dirección de envío para procesar tus pedidos."),
        block("uso", "shield-check", "2. Uso de la información", "Usamos tu información solo para procesar pedidos y enviarte confirmaciones. No vendemos tus datos."),
        block("auth", "lock", "3. Autenticación", "El inicio de sesión lo gestiona Clerk, una plataforma segura de autenticación."),
        block("pagos", "credit-card", "4. Pagos", "Los pagos los procesa Stripe. No tenemos acceso a tus datos bancarios."),
        block("cookies", "cookie", "5. Cookies", "Usamos cookies esenciales para mantener tu sesión y tu carrito."),
      ],
    },
    faqs: {
      intro: "",
      blocks: [
        block("pedido", "shopping-cart", "¿Cómo realizo un pedido?", "Agrega los productos al carrito y sigue el proceso de pago. Necesitas iniciar sesión para completar la compra."),
        block("pago", "credit-card", "¿Qué métodos de pago aceptan?", "Aceptamos tarjetas de crédito y débito procesadas de forma segura por Stripe."),
        block("envio", "package", "¿Cuánto tarda el envío?", "El tiempo de entrega depende de tu ubicación. Te informamos al confirmar tu pedido."),
        block("estado", "clipboard-list", "¿Cómo veo el estado de mi pedido?", 'Inicia sesión y entra a "Mis pedidos" para ver el historial y estado de tus compras.'),
      ],
    },
    help: {
      intro:
        "¿En qué podemos ayudarte? Explora los temas más comunes o escríbenos desde la página de contacto.",
      blocks: [
        block("comprar", "shopping-cart", "Cómo comprar", "Aprende a agregar productos al carrito y finalizar tu pedido.", "/faqs"),
        block("pagos", "credit-card", "Pagos", "Métodos de pago aceptados y seguridad.", "/faqs"),
        block("envios", "package", "Envíos", "Tiempos de entrega y seguimiento de pedidos.", "/faqs"),
        block("devoluciones", "rotate-ccw", "Devoluciones", "Condiciones de devolución y reembolsos.", "/terms"),
      ],
    },
  },
};
```

- [ ] **Step 4: Agregar `withDefaults` al final de `lib/brand.ts`**

```ts
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// A field missing in Sanity (undefined or null) takes the default; a stored value wins, even "" or [].
// Objects merge field by field over the default's keys only; a value of the wrong type falls back.
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
    for (const key of Object.keys(defaults)) out[key] = merge(raw[key], defaults[key]);
    return out as T;
  }
  return (typeof raw === typeof defaults ? raw : defaults) as T;
}

export const withDefaults = (raw: unknown, defaults: Brand): Brand => merge(raw, defaults);
```

- [ ] **Step 5: Correr y ver que pasa**

Run: `npm run check:permissions`
Expected: `check-permissions: ok`

- [ ] **Step 6: Commit**

```bash
git add constants/brandDefaults.ts lib/brand.ts scripts/check-permissions.mjs
git commit -m "feat: valores neutros de marca y relleno de configuración"
```

---

### Task 3: Leer la identidad en toda la tienda (consulta, esquema, contexto, metadatos)

**Files:**
- Modify: `sanity/queries/siteSettings.ts`
- Modify: `sanity/schemaTypes/siteSettingsType.ts`
- Modify: `lib/brand.ts` (agregar `ClientBrand`, `toClientBrand`)
- Modify: `components/StoreSettingsProvider.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/(client)/layout.tsx`
- Move: `app/favicon.ico` → `public/favicon.ico`

**Interfaces:**
- Consumes: `withDefaults`, `BRAND_DEFAULTS` (Task 2); constantes de `lib/validation.ts` (Task 1).
- Produces: `SiteSettings = { theme: ThemeKey; currency: CurrencyCode } & Brand`; `getSiteSettings(): Promise<SiteSettings>` (misma firma de llamada); `ClientBrand = Pick<Brand, "storeName" | "logoType" | "logoText" | "logoSubtext" | "logoImage" | "social">`; `toClientBrand(brand: Brand): ClientBrand`; `useBrand(): ClientBrand`; `StoreSettingsProvider` props `{ currency, brand, children }`.

- [ ] **Step 1: Reemplazar `sanity/queries/siteSettings.ts`**

```ts
import { client } from "../lib/client";
import { DEFAULT_THEME, isThemeKey, type ThemeKey } from "@/constants/themes";
import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from "@/constants/currencies";
import { BRAND_DEFAULTS } from "@/constants/brandDefaults";
import { withDefaults, type Brand } from "@/lib/brand";

export const SITE_SETTINGS_ID = "siteSettings";
export const SITE_SETTINGS_TAG = "siteSettings";

// Image fields come back as { assetId, url }, or null when no asset is set.
const image = (path: string) =>
  `select(defined(${path}.asset) => { "assetId": ${path}.asset._ref, "url": ${path}.asset->url })`;

const SITE_SETTINGS_QUERY = `*[_id == "siteSettings"][0]{
  theme, currency, storeName, tagline, description, logoType, logoText, logoSubtext,
  "logoImage": ${image("logoImage")},
  "favicon": ${image("favicon")},
  banner{ badge, title, highlight, subtitle, description, primaryCta, secondaryCta, stats, "image": ${image("image")} },
  contact, social, pages
}`;

export type SiteSettings = { theme: ThemeKey; currency: CurrencyCode } & Brand;

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const data = await client.fetch<Record<string, unknown> | null>(
      SITE_SETTINGS_QUERY,
      {},
      { useCdn: false, next: { revalidate: 3600, tags: [SITE_SETTINGS_TAG] } }
    );
    const theme = data?.theme;
    const currency = data?.currency;
    return {
      ...withDefaults(data, BRAND_DEFAULTS),
      theme: isThemeKey(theme) ? theme : DEFAULT_THEME,
      currency: isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY,
    };
  } catch (error) {
    console.log("Error fetching site settings", error);
    return { ...BRAND_DEFAULTS, theme: DEFAULT_THEME, currency: DEFAULT_CURRENCY };
  }
}
```

- [ ] **Step 2: Reemplazar `sanity/schemaTypes/siteSettingsType.ts`**

```ts
import { CogIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";
// Relative imports: the Sanity CLI (typegen) does not resolve the "@/" alias.
import { DEFAULT_THEME, THEMES } from "../../constants/themes";
import { CURRENCIES, DEFAULT_CURRENCY } from "../../constants/currencies";
import {
  CONTENT_ICONS,
  PAGE_KEYS,
  PAGE_LABELS,
  SOCIAL_KEYS,
  SOCIAL_LABELS,
} from "../../lib/validation";

const text = (name: string, title: string) => defineField({ name, title, type: "string" });
const longText = (name: string, title: string) =>
  defineField({ name, title, type: "text", rows: 3 });
const image = (name: string, title: string) => defineField({ name, title, type: "image" });
const cta = (name: string, title: string) =>
  defineField({ name, title, type: "object", fields: [text("label", "Texto"), text("href", "Enlace")] });

const pageFields = PAGE_KEYS.map((key) =>
  defineField({
    name: key,
    title: PAGE_LABELS[key],
    type: "object",
    fields: [
      longText("intro", "Introducción"),
      defineField({
        name: "blocks",
        title: "Bloques",
        type: "array",
        of: [
          defineArrayMember({
            type: "object",
            name: "contentBlock",
            title: "Bloque",
            fields: [
              defineField({
                name: "icon",
                title: "Ícono",
                type: "string",
                options: {
                  list: Object.entries(CONTENT_ICONS).map(([value, title]) => ({ title, value })),
                },
              }),
              text("title", "Título"),
              longText("text", "Texto"),
              text("href", "Enlace"),
            ],
          }),
        ],
      }),
    ],
  })
);

export const siteSettingsType = defineType({
  name: "siteSettings",
  title: "Configuración de la tienda",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "theme",
      title: "Paleta",
      type: "string",
      initialValue: DEFAULT_THEME,
      options: {
        list: Object.entries(THEMES).map(([value, theme]) => ({
          title: theme.name,
          value,
        })),
      },
    }),
    defineField({
      name: "currency",
      title: "Moneda",
      type: "string",
      initialValue: DEFAULT_CURRENCY,
      options: {
        list: Object.entries(CURRENCIES).map(([value, currency]) => ({
          title: currency.name,
          value,
        })),
      },
    }),
    text("storeName", "Nombre de la tienda"),
    text("tagline", "Eslogan"),
    longText("description", "Descripción"),
    defineField({
      name: "logoType",
      title: "Tipo de logo",
      type: "string",
      options: {
        list: [
          { title: "Texto", value: "text" },
          { title: "Imagen", value: "image" },
        ],
        layout: "radio",
      },
    }),
    text("logoText", "Logo: texto principal"),
    text("logoSubtext", "Logo: texto secundario"),
    image("logoImage", "Logo: imagen"),
    image("favicon", "Favicon"),
    defineField({
      name: "banner",
      title: "Banner de portada",
      type: "object",
      fields: [
        text("badge", "Etiqueta"),
        text("title", "Título"),
        text("highlight", "Parte resaltada"),
        text("subtitle", "Subtítulo"),
        longText("description", "Descripción"),
        cta("primaryCta", "Botón principal"),
        cta("secondaryCta", "Botón secundario"),
        image("image", "Imagen"),
        defineField({
          name: "stats",
          title: "Cifras",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              name: "bannerStat",
              title: "Cifra",
              fields: [text("value", "Valor"), text("label", "Etiqueta")],
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "contact",
      title: "Contacto",
      type: "object",
      fields: [
        text("email", "Correo"),
        text("phone", "Teléfono"),
        text("address", "Dirección"),
        text("hours", "Horario"),
      ],
    }),
    defineField({
      name: "social",
      title: "Redes sociales",
      type: "object",
      fields: SOCIAL_KEYS.map((key) => text(key, SOCIAL_LABELS[key])),
    }),
    defineField({ name: "pages", title: "Páginas", type: "object", fields: pageFields }),
  ],
});
```

- [ ] **Step 3: Agregar a `lib/brand.ts` (después del tipo `BrandSection`)**

```ts
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
```

- [ ] **Step 4: Reemplazar `components/StoreSettingsProvider.tsx`**

```tsx
"use client";

import { createContext, useContext } from "react";
import { DEFAULT_CURRENCY, type CurrencyCode } from "@/constants/currencies";
import { BRAND_DEFAULTS } from "@/constants/brandDefaults";
import { toClientBrand, type ClientBrand } from "@/lib/brand";

const CurrencyContext = createContext<CurrencyCode>(DEFAULT_CURRENCY);
const BrandContext = createContext<ClientBrand>(toClientBrand(BRAND_DEFAULTS));

// Makes store settings (from siteSettings) available to client components.
const StoreSettingsProvider = ({
  currency,
  brand,
  children,
}: {
  currency: CurrencyCode;
  brand: ClientBrand;
  children: React.ReactNode;
}) => (
  <CurrencyContext.Provider value={currency}>
    <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
  </CurrencyContext.Provider>
);

export const useCurrency = () => useContext(CurrencyContext);
export const useBrand = () => useContext(BrandContext);

export default StoreSettingsProvider;
```

- [ ] **Step 5: En `app/layout.tsx` pasar la marca**

Reemplazar:

```tsx
  const { theme, currency } = await getSiteSettings();
```

por:

```tsx
  const settings = await getSiteSettings();
```

Reemplazar `style={themeCssVars(theme) as React.CSSProperties}` por `style={themeCssVars(settings.theme) as React.CSSProperties}`.

Reemplazar:

```tsx
        <StoreSettingsProvider currency={currency}>{children}</StoreSettingsProvider>
```

por:

```tsx
        <StoreSettingsProvider currency={settings.currency} brand={toClientBrand(settings)}>
          {children}
        </StoreSettingsProvider>
```

Agregar el import: `import { toClientBrand } from "@/lib/brand";`

- [ ] **Step 6: En `app/(client)/layout.tsx` metadatos desde la configuración**

Reemplazar el bloque `export const metadata: Metadata = { ... };` por:

```tsx
export async function generateMetadata(): Promise<Metadata> {
  const { storeName, tagline, description, favicon } = await getSiteSettings();
  return {
    title: {
      template: `%s | ${storeName}`,
      default: tagline ? `${storeName} — ${tagline}` : storeName,
    },
    description,
    icons: { icon: favicon?.url ?? "/favicon.ico" },
  };
}
```

Agregar el import: `import { getSiteSettings } from "@/sanity/queries/siteSettings";`

- [ ] **Step 7: Mover el favicon por defecto a `public/`**

`app/favicon.ico` hace que Next agregue siempre su propio `<link rel="icon">`, que competiría con el configurado.

```bash
mkdir -p public && git mv app/favicon.ico public/favicon.ico
```

- [ ] **Step 8: Verificar tipos y pruebas**

Run: `npm run check:permissions && npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `check-permissions: ok` y luego `9`.

- [ ] **Step 9: Verificar en la tienda**

Con el servidor de desarrollo en el puerto 3000 (detener antes lo que ocupe 3000/3001; `npm run dev` en segundo plano):

Run: `curl -s http://localhost:3000/ | grep -o "<title>[^<]*" ; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/favicon.ico`
Expected: `<title>Mi tienda — Tu tienda en línea` (el documento `siteSettings` aún no tiene campos de marca) y `200`.

- [ ] **Step 10: Commit**

```bash
git add sanity/queries/siteSettings.ts sanity/schemaTypes/siteSettingsType.ts lib/brand.ts components/StoreSettingsProvider.tsx app/layout.tsx "app/(client)/layout.tsx" public/favicon.ico
git commit -m "feat: la tienda lee su identidad desde siteSettings"
```

---

### Task 4: Componentes de la tienda sin texto fijo

**Files:**
- Modify: `components/Logo.tsx`
- Modify: `components/Header.tsx:54`
- Modify: `components/HomeBanner.tsx`
- Modify: `components/SocialMedia.tsx`
- Modify: `components/FooterTop.tsx`
- Modify: `components/Footer.tsx`
- Create: `components/ContactForm.tsx`
- Modify: `app/(client)/contact/page.tsx`
- Modify: `constants/data.ts`
- Modify: `app/not-found.tsx`

**Interfaces:**
- Consumes: `useBrand()` (Task 3), `getSiteSettings()` (Task 3), `isValidHref`, `isHttpsUrl`, `SOCIAL_KEYS`, `SOCIAL_LABELS` (Task 1).
- Produces: `ContactForm` props `{ email: string; storeName: string }`. `Footer` pasa a `async`.

- [ ] **Step 1: Reemplazar `components/Logo.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";
import { useBrand } from "./StoreSettingsProvider";

const Logo = ({
  className,
  spanDesign,
}: {
  className?: string;
  spanDesign?: string;
}) => {
  const { storeName, logoType, logoText, logoSubtext, logoImage } = useBrand();

  if (logoType === "image" && logoImage) {
    return (
      <Link href={"/"} className="inline-flex items-center group">
        {/* eslint-disable-next-line @next/next/no-img-element -- store logos can be SVG */}
        <img src={logoImage.url} alt={storeName} className="h-10 w-auto max-w-44 object-contain" />
      </Link>
    );
  }

  return (
    <Link href={"/"} className="inline-flex items-baseline gap-1 group">
      <h2
        className={cn(
          "text-2xl font-black tracking-tight text-shop_dark_green group-hover:text-shop_dark_green/80 hoverEffect font-sans",
          className
        )}
      >
        {logoText}
      </h2>
      {logoSubtext && (
        <span
          className={cn(
            "text-xs font-semibold text-shop_light_green group-hover:text-shop_dark_green hoverEffect tracking-widest uppercase",
            spanDesign
          )}
        >
          {logoSubtext}
        </span>
      )}
    </Link>
  );
};

export default Logo;
```

- [ ] **Step 2: `components/Header.tsx` — nombre en la barra superior**

Reemplazar:

```tsx
          <span className="font-semibold tracking-wide">Bienvenido a Ecom by Yeison</span>
```

por:

```tsx
          <span className="font-semibold tracking-wide">Bienvenido a {settings.storeName}</span>
```

- [ ] **Step 3: Reemplazar `components/HomeBanner.tsx`**

```tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Zap } from "lucide-react";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { isValidHref } from "@/lib/validation";

const HomeBanner = async () => {
  const { banner } = await getSiteSettings();
  const { primaryCta, secondaryCta, image, stats } = banner;
  // Studio edits skip panel validation, so unsafe links are dropped here too.
  const showPrimary = primaryCta.label && isValidHref(primaryCta.href);
  const showSecondary = secondaryCta.label && isValidHref(secondaryCta.href);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-shop_dark_green my-4">
      {/* Decorative background circles */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full bg-shop_light_green/5 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between px-8 md:px-14 lg:px-20 py-12 md:py-10">
        <div className="space-y-5 max-w-md">
          {banner.badge && (
            <div className="inline-flex items-center gap-2 bg-shop_orange/20 text-shop_orange border border-shop_orange/30 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
              <Zap size={11} fill="currentColor" />
              {banner.badge}
            </div>
          )}

          {(banner.title || banner.highlight || banner.subtitle) && (
            <div className="space-y-2">
              {(banner.title || banner.highlight) && (
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
                  {banner.title}
                  {banner.title && banner.highlight && " "}
                  {banner.highlight && (
                    <span className="text-shop_orange relative">
                      {banner.highlight}
                      <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-shop_orange/50 rounded-full" />
                    </span>
                  )}
                </h1>
              )}
              {banner.subtitle && (
                <p className="text-xl md:text-2xl font-semibold text-white/80">{banner.subtitle}</p>
              )}
            </div>
          )}

          {banner.description && (
            <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-xs">
              {banner.description}
            </p>
          )}

          {(showPrimary || showSecondary) && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {showPrimary && (
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center gap-2 bg-shop_orange hover:bg-shop_orange/90 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg hover:shadow-shop_orange/30 active:scale-95"
                >
                  {primaryCta.label}
                  <ArrowRight size={15} />
                </Link>
              )}
              {showSecondary && (
                <Link
                  href={secondaryCta.href}
                  className="inline-flex items-center gap-2 border border-white/25 text-white/80 hover:text-white hover:border-white/50 hover:bg-white/10 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold text-sm hoverEffect"
                >
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}

          {stats.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
              {stats.map((stat, i) => (
                <React.Fragment key={stat._key}>
                  {i > 0 && <div className="w-px h-8 bg-white/20" />}
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">{stat.value}</p>
                    <p className="text-white/50 text-xs">{stat.label}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {image && (
          <div className="hidden md:flex items-center justify-center relative">
            <div className="absolute inset-0 bg-shop_light_green/10 rounded-full blur-3xl" />
            <Image
              src={image.url}
              alt={banner.title || banner.highlight || "Banner"}
              width={384}
              height={384}
              unoptimized={image.url.endsWith(".svg")}
              className="w-64 lg:w-80 xl:w-96 h-auto relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeBanner;
```

- [ ] **Step 4: Reemplazar `components/SocialMedia.tsx`**

```tsx
"use client";

import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaPinterest,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import type { IconType } from "react-icons";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { isHttpsUrl, SOCIAL_KEYS, SOCIAL_LABELS, type SocialKey } from "@/lib/validation";
import { useBrand } from "./StoreSettingsProvider";

interface Props {
  className?: string;
  iconClassName?: string;
  tooltipClassName?: string;
}

const SOCIAL_ICONS: Record<SocialKey, IconType> = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  linkedin: FaLinkedin,
  x: FaXTwitter,
  whatsapp: FaWhatsapp,
  pinterest: FaPinterest,
};

const SocialMedia = ({ className, iconClassName, tooltipClassName }: Props) => {
  const { social } = useBrand();
  const links = SOCIAL_KEYS.filter((key) => isHttpsUrl(social[key]));
  if (links.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-3.5", className)}>
        {links.map((key) => {
          const Icon = SOCIAL_ICONS[key];
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  href={social[key]}
                  aria-label={SOCIAL_LABELS[key]}
                  className={cn(
                    "p-2 border rounded-full hover:text-white hover:border-shop_light_green hoverEffect",
                    iconClassName
                  )}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent
                className={cn("bg-white text-darkColor font-semibold", tooltipClassName)}
              >
                {SOCIAL_LABELS[key]}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default SocialMedia;
```

- [ ] **Step 5: Reemplazar `components/FooterTop.tsx`**

```tsx
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import React from "react";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

const FooterTop = async () => {
  const { contact } = await getSiteSettings();
  const items = [
    { title: "Visítanos", value: contact.address, Icon: MapPin },
    { title: "Llámenos", value: contact.phone, Icon: Phone },
    { title: "Horario", value: contact.hours, Icon: Clock },
    { title: "Escríbenos", value: contact.email, Icon: Mail },
  ].filter((item) => item.value);
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-b border-gray-100 pb-8">
      {items.map(({ title, value, Icon }) => (
        <div
          key={title}
          className="flex items-center gap-4 group p-4 rounded-xl hover:bg-gray-50 hoverEffect"
        >
          <div className="w-11 h-11 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 group-hover:bg-shop_light_green/10 hoverEffect">
            <Icon className="h-6 w-6 text-shop_light_green" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FooterTop;
```

- [ ] **Step 6: Reemplazar `components/Footer.tsx`**

```tsx
import React from "react";
import Container from "./Container";
import FooterTop from "./FooterTop";
import Logo from "./Logo";
import SocialMedia from "./SocialMedia";
import { SubText, SubTitle } from "./ui/text";
import { categoriesData, quickLinksData } from "@/constants/data";
import Link from "next/link";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

const Footer = async () => {
  const { storeName, description } = await getSiteSettings();

  return (
    <footer className="bg-white border-t">
      <Container>
        <FooterTop />
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo />
            {description && <SubText>{description}</SubText>}
            <SocialMedia
              className="text-darkColor/60"
              iconClassName="border-darkColor/60 hover:border-shop_light_green hover:text-shop_light_green"
              tooltipClassName="bg-darkColor text-white"
            />
          </div>
          <div>
            <SubTitle>Enlaces rápidos</SubTitle>
            <ul className="space-y-3 mt-4">
              {quickLinksData?.map((item) => (
                <li key={item?.title}>
                  <Link
                    href={item?.href}
                    className="hover:text-shop_light_green hoverEffect font-medium"
                  >
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SubTitle>Categorías</SubTitle>
            <ul className="space-y-3 mt-4">
              {categoriesData?.map((item) => (
                <li key={item?.title}>
                  <Link
                    href={`/category/${item?.href}`}
                    className="hover:text-shop_light_green hoverEffect font-medium"
                  >
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <SubTitle>Boletín</SubTitle>
            <SubText>
              Suscríbete y recibe ofertas exclusivas y las últimas novedades
            </SubText>
            <form className="space-y-3">
              <Input placeholder="Tu correo electrónico" type="email" required />
              <Button className="w-full bg-shop_dark_green hover:bg-shop_dark_green/90 text-white">Suscribirme</Button>
            </form>
          </div>
        </div>
        <div className="py-6 border-t text-center text-sm text-gray-500">
          <div>
            © {new Date().getFullYear()} <strong>{storeName}</strong>. Todos
            los derechos reservados.
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
```

(El formulario del Boletín se reemplaza por `NewsletterForm` en Task 6.)

- [ ] **Step 7: Crear `components/ContactForm.tsx`**

```tsx
"use client";

import React from "react";

const INPUT =
  "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-shop_light_green/40";

// No backend: opens the visitor's mail app with the message addressed to the store.
const ContactForm = ({ email, storeName }: { email: string; storeName: string }) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = `Nombre: ${data.get("name")}\nCorreo: ${data.get("email")}\n\n${data.get("message")}`;
    const subject = `Mensaje desde ${storeName}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="name" type="text" required placeholder="Tu nombre" className={INPUT} />
      <input name="email" type="email" required placeholder="Tu correo electrónico" className={INPUT} />
      <textarea name="message" rows={4} required placeholder="Tu mensaje" className={`${INPUT} resize-none`} />
      <button
        type="submit"
        className="bg-shop_dark_green text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90 transition-colors"
      >
        Enviar mensaje
      </button>
    </form>
  );
};

export default ContactForm;
```

- [ ] **Step 8: Reemplazar `app/(client)/contact/page.tsx`**

```tsx
import Container from "@/components/Container";
import ContactForm from "@/components/ContactForm";
import { Title } from "@/components/ui/text";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function ContactPage() {
  const { contact, storeName } = await getSiteSettings();
  const items = [
    { title: "Escríbenos", value: contact.email, Icon: Mail },
    { title: "Llámenos", value: contact.phone, Icon: Phone },
    { title: "Ubicación", value: contact.address, Icon: MapPin },
    { title: "Horario", value: contact.hours, Icon: Clock },
  ].filter((item) => item.value);

  return (
    <Container className="py-16">
      <Title className="mb-6">Contáctanos</Title>
      <div className="max-w-3xl grid md:grid-cols-2 gap-10">
        <div className="space-y-4">
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            ¿Tienes alguna duda, sugerencia o necesitas ayuda con tu pedido?
            Escríbenos y te responderemos a la brevedad.
          </p>
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
        {contact.email && <ContactForm email={contact.email} storeName={storeName} />}
      </div>
    </Container>
  );
}
```

- [ ] **Step 9: `constants/data.ts` — etiquetas en español**

Reemplazar los arreglos `headerData`, `quickLinksData` y `categoriesData` (no tocar `productType`) por:

```ts
export const headerData = [
  { title: "Inicio", href: "/" },
  { title: "Tienda", href: "/shop" },
  { title: "Blog", href: "/blog" },
  { title: "Ofertas", href: "/deal" },
  //   { title: "Contáctanos", href: "/contact" },
];
export const quickLinksData = [
  { title: "Nosotros", href: "/about" },
  { title: "Contáctanos", href: "/contact" },
  { title: "Términos y condiciones", href: "/terms" },
  { title: "Política de privacidad", href: "/privacy" },
  { title: "Preguntas frecuentes", href: "/faqs" },
  { title: "Ayuda", href: "/help" },
];
export const categoriesData = [
  { title: "Móviles", href: "mobiles" },
  { title: "Electrodomésticos", href: "appliances" },
  { title: "Smartphones", href: "smartphones" },
  { title: "Aires acondicionados", href: "air-conditioners" },
  { title: "Lavadoras", href: "washing-machine" },
  { title: "Electrodomésticos de cocina", href: "kitchen-appliances" },
  { title: "Accesorios", href: "gadget-accessories" },
];
```

- [ ] **Step 10: Reemplazar `app/not-found.tsx`**

```tsx
import Logo from "@/components/Logo";
import Link from "next/link";
import React from "react";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

const NotFoundPage = async () => {
  const { storeName } = await getSiteSettings();

  return (
    <div className="bg-white flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-10 md:py-32">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">¿Buscas algo?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Lo sentimos, la página que buscas no existe.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Link
            href="/"
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-shop_dark_green/80 hover:bg-shop_dark_green hoverEffect"
          >
            Ir al inicio de {storeName}
          </Link>
          <Link
            href="/help"
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-semibold rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Ayuda
          </Link>
        </div>
        <p className="mt-8 text-center text-sm text-gray-600">
          ¿Necesitas ayuda? Visita la sección de{" "}
          <Link href="/help" className="font-medium text-shop_dark_green hover:underline">
            Ayuda
          </Link>{" "}
          o{" "}
          <Link href="/contact" className="font-medium text-shop_dark_green hover:underline">
            contáctanos
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;
```

- [ ] **Step 11: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `9`.

- [ ] **Step 12: Verificar en la tienda (servidor en 3000)**

Run:

```bash
curl -s http://localhost:3000/ | grep -o "Bienvenido a [^<]*" | head -1
curl -s http://localhost:3000/ | grep -c "Ecom by Yeison\|Quick Links\|Newsletter"
curl -s http://localhost:3000/contact | grep -c "Escríbenos"
curl -s http://localhost:3000/no-existe | grep -o "Ir al inicio de [^<]*"
```

Expected: `Bienvenido a Mi tienda`; `0`; `0` (sin contacto configurado no hay datos ni formulario); `Ir al inicio de Mi tienda`.

- [ ] **Step 13: Commit**

```bash
git add components/Logo.tsx components/Header.tsx components/HomeBanner.tsx components/SocialMedia.tsx components/FooterTop.tsx components/Footer.tsx components/ContactForm.tsx "app/(client)/contact/page.tsx" constants/data.ts app/not-found.tsx
git commit -m "feat: logo, banner, contacto, redes y pie desde la configuración"
```

---

### Task 5: Páginas de contenido por bloques

**Files:**
- Create: `components/contentIcons.ts`
- Create: `components/ContentBlocks.tsx`
- Modify: `app/(client)/about/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `faqs/page.tsx`, `help/page.tsx`

**Interfaces:**
- Consumes: `PageContent`, `ContentBlock` (Task 1), `getSiteSettings()` (Task 3), `isValidHref` (Task 1).
- Produces: `CONTENT_ICON_COMPONENTS: Record<ContentIconKey, LucideIcon>` (lo usa también Task 10); `ContentBlocks` props `{ page: PageContent; layout: "grid" | "list" }`.

- [ ] **Step 1: Crear `components/contentIcons.ts`**

```ts
import {
  ClipboardList,
  Cookie,
  CreditCard,
  FileText,
  Headset,
  HelpCircle,
  Lock,
  Mail,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { ContentIconKey } from "@/lib/validation";

export const CONTENT_ICON_COMPONENTS: Record<ContentIconKey, LucideIcon> = {
  truck: Truck,
  "shield-check": ShieldCheck,
  headset: Headset,
  star: Star,
  "shopping-cart": ShoppingCart,
  "credit-card": CreditCard,
  package: Package,
  "rotate-ccw": RotateCcw,
  "clipboard-list": ClipboardList,
  "help-circle": HelpCircle,
  "file-text": FileText,
  mail: Mail,
  "user-check": UserCheck,
  lock: Lock,
  cookie: Cookie,
};
```

- [ ] **Step 2: Crear `components/ContentBlocks.tsx`**

```tsx
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import type { ContentBlock, PageContent } from "@/lib/brand";
import { isValidHref } from "@/lib/validation";
import { CONTENT_ICON_COMPONENTS } from "./contentIcons";

const CARD =
  "flex items-start gap-4 group p-4 rounded-xl border border-gray-100 bg-white hover:border-shop_light_green/30 hover:shadow-sm hoverEffect";

function Block({ block }: { block: ContentBlock }) {
  // Studio edits skip panel validation: unknown icons and unsafe links fall back safely.
  const Icon = CONTENT_ICON_COMPONENTS[block.icon] ?? HelpCircle;
  const body = (
    <>
      <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green group-hover:bg-shop_light_green/10 hoverEffect">
        <Icon size={24} />
      </div>
      <div>
        <h3 className="font-semibold text-gray-800 text-sm mb-1">{block.title}</h3>
        {block.text && <p className="text-gray-500 text-sm leading-relaxed">{block.text}</p>}
      </div>
    </>
  );
  if (!block.href || !isValidHref(block.href)) return <div className={CARD}>{body}</div>;
  if (block.href.startsWith("/")) {
    return (
      <Link href={block.href} className={CARD}>
        {body}
      </Link>
    );
  }
  return (
    <a href={block.href} target="_blank" rel="noopener noreferrer" className={CARD}>
      {body}
    </a>
  );
}

const ContentBlocks = ({ page, layout }: { page: PageContent; layout: "grid" | "list" }) => (
  <>
    {page.intro && (
      <div className="max-w-3xl space-y-4 text-gray-600 leading-relaxed mb-10">
        {page.intro.split(/\n\s*\n/).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    )}
    {page.blocks.length > 0 && (
      <div className={layout === "grid" ? "grid sm:grid-cols-2 gap-4 max-w-3xl" : "max-w-3xl space-y-3"}>
        {page.blocks.map((block, i) => (
          <Block key={block._key ?? i} block={block} />
        ))}
      </div>
    )}
  </>
);

export default ContentBlocks;
```

- [ ] **Step 3: Reemplazar las 5 páginas**

`app/(client)/about/page.tsx`:

```tsx
import Container from "@/components/Container";
import ContentBlocks from "@/components/ContentBlocks";
import { Title } from "@/components/ui/text";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function AboutPage() {
  const { pages } = await getSiteSettings();
  return (
    <Container className="py-16">
      <Title className="mb-4">Sobre Nosotros</Title>
      <ContentBlocks page={pages.about} layout="grid" />
    </Container>
  );
}
```

`app/(client)/terms/page.tsx`:

```tsx
import Container from "@/components/Container";
import ContentBlocks from "@/components/ContentBlocks";
import { Title } from "@/components/ui/text";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function TermsPage() {
  const { pages } = await getSiteSettings();
  return (
    <Container className="py-16">
      <Title className="mb-8">Términos y Condiciones</Title>
      <ContentBlocks page={pages.terms} layout="list" />
    </Container>
  );
}
```

`app/(client)/privacy/page.tsx`:

```tsx
import Container from "@/components/Container";
import ContentBlocks from "@/components/ContentBlocks";
import { Title } from "@/components/ui/text";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function PrivacyPage() {
  const { pages } = await getSiteSettings();
  return (
    <Container className="py-16">
      <Title className="mb-8">Política de Privacidad</Title>
      <ContentBlocks page={pages.privacy} layout="list" />
    </Container>
  );
}
```

`app/(client)/faqs/page.tsx`:

```tsx
import Container from "@/components/Container";
import ContentBlocks from "@/components/ContentBlocks";
import { Title } from "@/components/ui/text";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function FaqsPage() {
  const { pages } = await getSiteSettings();
  return (
    <Container className="py-16">
      <Title className="mb-8">Preguntas Frecuentes</Title>
      <ContentBlocks page={pages.faqs} layout="list" />
    </Container>
  );
}
```

`app/(client)/help/page.tsx`:

```tsx
import Container from "@/components/Container";
import ContentBlocks from "@/components/ContentBlocks";
import { Title } from "@/components/ui/text";
import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function HelpPage() {
  const { pages } = await getSiteSettings();
  return (
    <Container className="py-16">
      <Title className="mb-4">Centro de Ayuda</Title>
      <ContentBlocks page={pages.help} layout="grid" />

      <div className="p-6 bg-shop_light_bg rounded-2xl max-w-3xl mt-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green">
            <HelpCircle size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">¿No encontraste lo que buscas?</h3>
            <p className="text-gray-500 text-xs mt-0.5">Nuestro equipo está disponible para ayudarte.</p>
          </div>
        </div>
        <Link
          href="/contact"
          className="inline-block bg-shop_dark_green text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90 transition-colors"
        >
          Enviar mensaje
        </Link>
      </div>
    </Container>
  );
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `9`.

- [ ] **Step 5: Verificar en la tienda (servidor en 3000)**

Run:

```bash
for p in about terms privacy faqs help; do printf "%s " $p; curl -s http://localhost:3000/$p | grep -c "Atención al cliente\|1. Uso del sitio\|1. Información que recopilamos\|¿Cómo realizo un pedido?\|Cómo comprar"; done
curl -s http://localhost:3000/help | grep -o 'href="/faqs"' | head -1
```

Expected: cada página imprime `1` (o más); la última línea `href="/faqs"`.

- [ ] **Step 6: Commit**

```bash
git add components/contentIcons.ts components/ContentBlocks.tsx "app/(client)/about/page.tsx" "app/(client)/terms/page.tsx" "app/(client)/privacy/page.tsx" "app/(client)/faqs/page.tsx" "app/(client)/help/page.tsx"
git commit -m "feat: páginas de contenido por bloques desde la configuración"
```

---

### Task 6: Newsletter (guardar suscriptores)

**Files:**
- Create: `sanity/schemaTypes/subscriberType.ts`
- Modify: `sanity/schemaTypes/index.ts`
- Create: `actions/newsletter.ts`
- Create: `components/NewsletterForm.tsx`
- Modify: `components/Footer.tsx`

**Interfaces:**
- Consumes: `validateSubscription` (Task 1), `backendClient`.
- Produces: `subscribe(input: unknown): Promise<SubscribeResult>`, `SubscribeResult = { ok: true; message: string } | { ok: false; errors: Record<string, string> }`; `NewsletterForm` props `{ storeName: string }`.

- [ ] **Step 1: Crear `sanity/schemaTypes/subscriberType.ts`**

```ts
import { EnvelopeIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const subscriberType = defineType({
  name: "subscriber",
  title: "Suscriptor",
  type: "document",
  icon: EnvelopeIcon,
  readOnly: true,
  fields: [
    defineField({ name: "email", title: "Correo", type: "string" }),
    defineField({ name: "consent", title: "Aceptó recibir correos", type: "boolean" }),
    defineField({ name: "subscribedAt", title: "Fecha", type: "datetime" }),
    defineField({ name: "source", title: "Origen", type: "string" }),
  ],
  preview: { select: { title: "email", subtitle: "subscribedAt" } },
});
```

En `sanity/schemaTypes/index.ts` agregar `import { subscriberType } from "./subscriberType";` y `subscriberType,` al final de `types`.

- [ ] **Step 2: Crear `actions/newsletter.ts`**

```ts
"use server";

import { createHash } from "node:crypto";
import { validateSubscription } from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";

export type SubscribeResult =
  | { ok: true; message: string }
  | { ok: false; errors: Record<string, string> };

const SUCCESS = "¡Listo! Te suscribiste";

// Public action. Same answer whether the email already existed, so nobody can probe the list.
// ponytail: no rate limit; add one if bots start filling the list.
export async function subscribe(input: unknown): Promise<SubscribeResult> {
  const honeypot = (input as { website?: unknown } | null)?.website;
  if (typeof honeypot === "string" && honeypot) return { ok: true, message: SUCCESS };

  const result = validateSubscription(input);
  if (!result.ok) return { ok: false, errors: result.errors };
  const { email } = result.value;

  try {
    // The dot in the id keeps subscribers out of Sanity's public read API; same email, same id.
    const id = `subscriber.${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
    await backendClient.createIfNotExists({
      _id: id,
      _type: "subscriber",
      email,
      consent: true,
      subscribedAt: new Date().toISOString(),
      source: "footer",
    });
    return { ok: true, message: SUCCESS };
  } catch (error) {
    console.log("Subscribe failed", error);
    return { ok: false, errors: { form: "No pudimos suscribirte, intenta de nuevo" } };
  }
}
```

- [ ] **Step 3: Crear `components/NewsletterForm.tsx`**

```tsx
"use client";

import React, { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { subscribe } from "@/actions/newsletter";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const NewsletterForm = ({ storeName }: { storeName: string }) => {
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
        if (result.errors.form) toast.error(result.errors.form);
        return;
      }
      setErrors({});
      form.reset();
      toast.success(result.message);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <Input
        name="email"
        type="email"
        placeholder="Tu correo electrónico"
        aria-label="Tu correo electrónico"
        aria-invalid={Boolean(errors.email)}
      />
      {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input type="checkbox" name="consent" className="mt-0.5" />
        Acepto recibir correos de {storeName}
      </label>
      {errors.consent && <p className="text-xs text-red-600">{errors.consent}</p>}
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
        className="w-full bg-shop_dark_green hover:bg-shop_dark_green/90 text-white"
      >
        {pending ? "Enviando…" : "Suscribirme"}
      </Button>
    </form>
  );
};

export default NewsletterForm;
```

- [ ] **Step 4: Usarlo en `components/Footer.tsx`**

Reemplazar:

```tsx
            <form className="space-y-3">
              <Input placeholder="Tu correo electrónico" type="email" required />
              <Button className="w-full bg-shop_dark_green hover:bg-shop_dark_green/90 text-white">Suscribirme</Button>
            </form>
```

por:

```tsx
            <NewsletterForm storeName={storeName} />
```

Quitar los imports de `Input` y `Button`; agregar `import NewsletterForm from "./NewsletterForm";`.

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `9`.

- [ ] **Step 6: Verificar en el navegador (servidor en 3000)**

En `http://localhost:3000`, en el pie:
1. Enviar sin marcar la casilla: "Debes aceptar para suscribirte".
2. Escribir `prueba-newsletter@example.com`, marcar y enviar: toast "¡Listo! Te suscribiste".
3. Repetir con `  PRUEBA-newsletter@Example.com `: el mismo toast.

Run (con `SANITY_API_TOKEN` del `.env.local`): `node --env-file=.env.local -e "import('@sanity/client').then(async ({createClient}) => { const c = createClient({projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: '2025-03-20', token: process.env.SANITY_API_TOKEN, useCdn: false}); console.log(await c.fetch('count(*[_type == \"subscriber\" && email == \"prueba-newsletter@example.com\"])')); const pub = createClient({projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: '2025-03-20', useCdn: false}); console.log(await pub.fetch('count(*[_type == \"subscriber\"])')); })"`
Expected: `1` (un solo documento) y `0` (sin token no se ven suscriptores).

Luego borrar el documento de prueba desde Sanity Studio (`/studio`, tipo Suscriptor), o dejarlo si el usuario prefiere.

- [ ] **Step 7: Commit**

```bash
git add sanity/schemaTypes/subscriberType.ts sanity/schemaTypes/index.ts actions/newsletter.ts components/NewsletterForm.tsx components/Footer.tsx
git commit -m "feat: el boletín del pie guarda suscriptores"
```

---

### Task 7: Ecom by Yeison como primer cliente

**Files:**
- Create: `scripts/seed-ecom-by-yeison.mjs`
- Modify: `package.json` (script `seed:yeison`)

**Interfaces:**
- Consumes: estructura de `siteSettings` (Tasks 1–3). Los `_type` de arreglos (`contentBlock`, `bannerStat`) deben coincidir con los que usa `actions/brand.ts` (Task 8).
- Produces: documento `siteSettings` con la identidad de Ecom by Yeison.

- [ ] **Step 1: Crear `scripts/seed-ecom-by-yeison.mjs`**

```js
// Saves Ecom by Yeison (the first client) into siteSettings.
// Only fills fields that do not exist yet, so it never overwrites panel edits. Safe to re-run.
// Run: npm run seed:yeison
import { createReadStream } from "node:fs";
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2025-03-20",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const ID = "siteSettings";
const block = (_key, icon, title, text, href = "") => ({
  _type: "contentBlock",
  _key,
  icon,
  title,
  text,
  href,
});
const stat = (_key, value, label) => ({ _type: "bannerStat", _key, value, label });

const fields = {
  storeName: "Ecom by Yeison",
  tagline: "Tu tienda de tecnología",
  description:
    "Ecom by Yeison es tu destino de tecnología premium. Exploramos lo más nuevo en gadgets, electrónica y accesorios con los mejores precios del mercado.",
  logoType: "text",
  logoText: "Ecom",
  logoSubtext: "by Yeison",
  contact: {
    email: "contacto@ecombyyeison.com",
    phone: "+57 300 000 0000",
    address: "Colombia, Latam",
    hours: "Lun - Sáb: 9:00 AM - 7:00 PM",
  },
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
};

const banner = {
  badge: "Oferta por tiempo limitado",
  title: "Hasta",
  highlight: "50% OFF",
  subtitle: "en auriculares seleccionados",
  description:
    "Descubre nuestra colección exclusiva de audio premium con envío gratis en tu primer pedido.",
  primaryCta: { label: "Comprar ahora", href: "/shop" },
  secondaryCta: { label: "Ver ofertas", href: "/deal" },
  stats: [stat("productos", "28+", "Productos"), stat("marcas", "5", "Marcas top"), stat("soporte", "24/7", "Soporte")],
};

const pages = {
  about: {
    intro:
      "Ecom by Yeison es tu tienda de tecnología premium. Nos especializamos en gadgets, electrónica y accesorios de las mejores marcas del mundo: Samsung, Apple, Sony, LG y Dell.\n\nNuestra misión es acercarte los productos más innovadores del mercado con precios competitivos, atención personalizada y una experiencia de compra segura y confiable.\n\nDesde smartphones hasta laptops, auriculares y televisores, en Ecom by Yeison encontrarás todo lo que necesitas para mantenerte conectado con la tecnología de vanguardia.",
    blocks: [
      block("envios", "truck", "Envío a todo el mundo", "Enviamos a Colombia y al mundo con las mejores tarifas."),
      block("seguro", "shield-check", "Compra 100% segura", "Tus datos y pagos están protegidos en todo momento."),
      block("soporte", "headset", "Soporte 24/7", "Nuestro equipo está siempre disponible para ayudarte."),
      block("premium", "star", "Productos premium", "Solo trabajamos con marcas y productos verificados."),
    ],
  },
  terms: {
    intro: "",
    blocks: [
      block("uso", "file-text", "1. Uso del sitio", "Al acceder y utilizar Ecom by Yeison, aceptas cumplir con estos términos y condiciones. El uso del sitio está sujeto a las leyes aplicables de Colombia."),
      block("precios", "file-text", "2. Productos y precios", "Nos reservamos el derecho de modificar precios, disponibilidad y descripciones de productos sin previo aviso. Los precios están expresados en dólares estadounidenses (USD)."),
      block("pagos", "credit-card", "3. Pagos", "Los pagos se procesan de forma segura a través de Stripe. No almacenamos datos de tarjetas de crédito en nuestros servidores."),
      block("devoluciones", "rotate-ccw", "4. Devoluciones", "Aceptamos devoluciones dentro de los 30 días posteriores a la recepción del producto, siempre que esté en su estado original y con embalaje intacto."),
      block("garantia", "shield-check", "5. Garantía", "Todos los productos cuentan con la garantía del fabricante. Consulta cada producto para ver el período de garantía específico."),
      block("contacto", "mail", "6. Contacto", "Para cualquier consulta sobre estos términos, contáctanos en nuestra página de contacto."),
    ],
  },
  privacy: {
    intro: "",
    blocks: [
      block("datos", "user-check", "1. Información que recopilamos", "Recopilamos tu nombre, correo electrónico y dirección de envío al momento de realizar una compra. Esta información es necesaria para procesar tu pedido."),
      block("uso", "shield-check", "2. Uso de la información", "Usamos tu información únicamente para procesar pedidos, enviarte confirmaciones de compra y mejorar tu experiencia. No vendemos ni compartimos tus datos con terceros."),
      block("auth", "lock", "3. Autenticación", "El inicio de sesión está gestionado por Clerk, una plataforma segura de autenticación. Consulta su política en clerk.com/privacy."),
      block("pagos", "credit-card", "4. Pagos", "Los pagos son procesados por Stripe de forma segura. No tenemos acceso a tus datos bancarios. Consulta la política de Stripe en stripe.com/privacy."),
      block("cookies", "cookie", "5. Cookies", "Usamos cookies esenciales para mantener tu sesión activa y guardar tu carrito de compras. No usamos cookies de rastreo publicitario."),
    ],
  },
  faqs: {
    intro: "",
    blocks: [
      block("pedido", "shopping-cart", "¿Cómo realizo un pedido?", "Navega por nuestro catálogo, agrega los productos al carrito y sigue el proceso de pago. Necesitas iniciar sesión para completar la compra."),
      block("pago", "credit-card", "¿Qué métodos de pago aceptan?", "Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) procesadas de forma segura a través de Stripe."),
      block("envio", "package", "¿Cuánto tarda el envío?", "El tiempo de envío varía según tu ubicación. Generalmente entre 3 y 7 días hábiles para Colombia, y de 7 a 15 días para envíos internacionales."),
      block("devolver", "rotate-ccw", "¿Puedo devolver un producto?", "Sí. Tienes 30 días desde la recepción del producto para solicitar una devolución, siempre que esté en su estado original."),
      block("garantia", "shield-check", "¿Los productos tienen garantía?", "Todos los productos cuentan con la garantía del fabricante. Consulta cada producto para ver el período de garantía específico."),
      block("estado", "clipboard-list", "¿Cómo puedo ver el estado de mi pedido?", 'Una vez autenticado, ve a la sección "Mis Pedidos" en el menú de tu cuenta para ver el historial y estado de tus compras.'),
      block("seguro", "help-circle", "¿Es seguro comprar aquí?", "Sí. Usamos Clerk para autenticación segura y Stripe para pagos. Ningún dato bancario es almacenado en nuestros servidores."),
    ],
  },
  help: {
    intro: "¿En qué podemos ayudarte? Explora los temas más comunes o contáctanos directamente.",
    blocks: [
      block("comprar", "shopping-cart", "Cómo comprar", "Aprende a navegar la tienda, agregar al carrito y finalizar tu pedido.", "/faqs"),
      block("pagos", "credit-card", "Pagos", "Información sobre métodos de pago aceptados y seguridad.", "/faqs"),
      block("envios", "package", "Envíos", "Tiempos de entrega y seguimiento de pedidos.", "/faqs"),
      block("devoluciones", "rotate-ccw", "Devoluciones", "Política de devoluciones y cómo solicitar un reembolso.", "/terms"),
    ],
  },
};

await client.createIfNotExists({ _id: ID, _type: "siteSettings" });
const existing = await client.fetch(`*[_id == $id][0]{ "hasBanner": defined(banner) }`, { id: ID });

const set = { ...fields };
if (!existing?.hasBanner) {
  // Upload only when the banner will actually be written, to avoid orphan assets on re-runs.
  const asset = await client.assets.upload("image", createReadStream("images/banner/banner_1.png"), {
    filename: "banner_1.png",
  });
  set.banner = { ...banner, image: { _type: "image", asset: { _type: "reference", _ref: asset._id } } };
}

let patch = client.patch(ID).setIfMissing(set).setIfMissing({ pages: {} });
for (const [key, page] of Object.entries(pages)) {
  patch = patch.setIfMissing({ [`pages.${key}`]: page });
}
await patch.commit();
console.log("seed-ecom-by-yeison: ok");
```

- [ ] **Step 2: Script en `package.json`**

Agregar en `scripts`, después de `check:permissions`:

```json
    "seed:yeison": "node --env-file=.env.local scripts/seed-ecom-by-yeison.mjs"
```

(con la coma correspondiente en la línea anterior).

- [ ] **Step 3: Correr el script**

Escribe en el dataset `production` del proyecto Sanity del usuario (es su tienda; el spec lo pide).

Run: `npm run seed:yeison`
Expected: `seed-ecom-by-yeison: ok`

- [ ] **Step 4: Correrlo otra vez (no duplica ni sube otra imagen)**

Run: `npm run seed:yeison && node --env-file=.env.local -e "import('@sanity/client').then(async ({createClient}) => { const c = createClient({projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: '2025-03-20', token: process.env.SANITY_API_TOKEN, useCdn: false}); console.log(await c.fetch('count(*[_type == \"sanity.imageAsset\" && originalFilename == \"banner_1.png\"])')); })"`
Expected: `seed-ecom-by-yeison: ok` y `1`.

- [ ] **Step 5: La tienda vuelve a verse como Ecom by Yeison (servidor en 3000)**

La caché de `siteSettings` dura hasta 1 h; reiniciar el servidor de desarrollo (detener lo que ocupe 3000 y volver a correr `npm run dev`) para verla ya.

Run:

```bash
curl -s http://localhost:3000/ | grep -o "<title>[^<]*"
curl -s http://localhost:3000/ | grep -o "Bienvenido a [^<]*" | head -1
curl -s http://localhost:3000/ | grep -c "50% OFF"
curl -s http://localhost:3000/contact | grep -c "contacto@ecombyyeison.com"
curl -s http://localhost:3000/faqs | grep -c "¿Es seguro comprar aquí?"
```

Expected: `<title>Ecom by Yeison — Tu tienda de tecnología`, `Bienvenido a Ecom by Yeison`, y `1` (o más) en las tres últimas.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-ecom-by-yeison.mjs package.json
git commit -m "feat: Ecom by Yeison guardado como configuración del primer cliente"
```

---

### Task 8: Acciones de servidor de marca

**Files:**
- Create: `lib/actionResult.ts`
- Modify: `actions/admin.ts` (quitar `ActionResult` y `run`, importarlos)
- Create: `actions/brand.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: validadores y constantes (Task 1), `requirePermission` (`lib/roles.ts`), `SITE_SETTINGS_ID`, `SITE_SETTINGS_TAG` (Task 3).
- Produces: `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; errors?: Record<string, string> }` y `run<T>(action) => Promise<ActionResult<T>>` en `lib/actionResult.ts`; `saveBrandSection(section: string, data: unknown): Promise<ActionResult<null>>`; `savePage(pageKey: string, data: unknown): Promise<ActionResult<null>>`; `uploadImage(formData: FormData): Promise<ActionResult<ImageValue>>` (campo `file`).

- [ ] **Step 1: Crear `lib/actionResult.ts`**

```ts
import { NOT_AUTHORIZED } from "./roles";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errors?: Record<string, string> };

// Server action errors are redacted in production, so return a result object instead of throwing.
export async function run<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    console.log("Admin action failed", error);
    const denied = error instanceof Error && error.message === NOT_AUTHORIZED;
    return {
      ok: false,
      error: denied
        ? "No tienes permiso para esta acción"
        : "No se pudo completar la acción",
    };
  }
}
```

- [ ] **Step 2: `actions/admin.ts` usa el módulo compartido**

Borrar la línea `export type ActionResult<T> = ...;` y la función `run` completa (con su comentario). Agregar:

```ts
import { run, type ActionResult } from "@/lib/actionResult";
```

`NOT_AUTHORIZED` sigue importándose de `@/lib/roles` (lo usa `setUserRole`).

- [ ] **Step 3: Crear `actions/brand.ts`**

```ts
"use server";

import { revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/roles";
import { run, type ActionResult } from "@/lib/actionResult";
import type { ImageValue } from "@/lib/brand";
import {
  IMAGE_ERROR,
  INVALID_FORM,
  PAGE_KEYS,
  validateBanner,
  validateContact,
  validateIdentity,
  validateImageFile,
  validatePage,
  validateSocial,
} from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";
import { SITE_SETTINGS_ID, SITE_SETTINGS_TAG } from "@/sanity/queries/siteSettings";

type Write = { set: Record<string, unknown>; unset: string[]; images: ImageValue[] };
type Planned = { ok: true; write: Write } | { ok: false; errors: Record<string, string> };

const sanityImage = (image: ImageValue) => ({
  _type: "image",
  asset: { _type: "reference", _ref: image.assetId },
});

// Validated section -> Sanity patch. Removed images are unset, never stored as null.
// Array items get the _type Studio expects.
function planSection(section: string, data: unknown): Planned {
  switch (section) {
    case "identity": {
      const r = validateIdentity(data);
      if (!r.ok) return r;
      const { logoImage, favicon, ...texts } = r.value;
      const write: Write = { set: { ...texts }, unset: [], images: [] };
      for (const [key, image] of [
        ["logoImage", logoImage],
        ["favicon", favicon],
      ] as const) {
        if (image) {
          write.set[key] = sanityImage(image);
          write.images.push(image);
        } else {
          write.unset.push(key);
        }
      }
      return { ok: true, write };
    }
    case "banner": {
      const r = validateBanner(data);
      if (!r.ok) return r;
      const { image, stats, ...texts } = r.value;
      const banner = {
        ...texts,
        stats: stats.map((stat) => ({ _type: "bannerStat", ...stat })),
        ...(image ? { image: sanityImage(image) } : {}),
      };
      return { ok: true, write: { set: { banner }, unset: [], images: image ? [image] : [] } };
    }
    case "contact": {
      const r = validateContact(data);
      if (!r.ok) return r;
      return { ok: true, write: { set: { contact: r.value }, unset: [], images: [] } };
    }
    case "social": {
      const r = validateSocial(data);
      if (!r.ok) return r;
      return { ok: true, write: { set: { social: r.value }, unset: [], images: [] } };
    }
    default:
      return { ok: false, errors: {} };
  }
}

// Asset ids come from the browser: only reference images that exist in this dataset.
async function assertImagesExist(images: ImageValue[]) {
  if (images.length === 0) return;
  const ids = [...new Set(images.map((image) => image.assetId))];
  const found = await backendClient.fetch<number>(
    `count(*[_type == "sanity.imageAsset" && _id in $ids])`,
    { ids },
    { useCdn: false }
  );
  if (found !== ids.length) throw new Error("Imagen inexistente");
}

async function ensureSettings() {
  await backendClient.createIfNotExists({ _id: SITE_SETTINGS_ID, _type: "siteSettings" });
}

export async function saveBrandSection(
  section: string,
  data: unknown
): Promise<ActionResult<null>> {
  const planned = planSection(section, data);
  if (!planned.ok) return { ok: false, error: INVALID_FORM, errors: planned.errors };
  return run(async () => {
    await requirePermission("configurar");
    await assertImagesExist(planned.write.images);
    await ensureSettings();
    let patch = backendClient.patch(SITE_SETTINGS_ID).set(planned.write.set);
    if (planned.write.unset.length > 0) patch = patch.unset(planned.write.unset);
    await patch.commit();
    revalidateTag(SITE_SETTINGS_TAG);
    return null;
  });
}

export async function savePage(pageKey: string, data: unknown): Promise<ActionResult<null>> {
  if (!(PAGE_KEYS as readonly string[]).includes(pageKey)) {
    return { ok: false, error: INVALID_FORM };
  }
  const r = validatePage(data);
  if (!r.ok) return { ok: false, error: INVALID_FORM, errors: r.errors };
  const page = {
    ...r.value,
    blocks: r.value.blocks.map((block) => ({ _type: "contentBlock", ...block })),
  };
  return run(async () => {
    await requirePermission("configurar");
    await ensureSettings();
    await backendClient
      .patch(SITE_SETTINGS_ID)
      .setIfMissing({ pages: {} })
      .set({ [`pages.${pageKey}`]: page })
      .commit();
    revalidateTag(SITE_SETTINGS_TAG);
    return null;
  });
}

export async function uploadImage(formData: FormData): Promise<ActionResult<ImageValue>> {
  const file = formData.get("file");
  if (!(file instanceof File) || validateImageFile(file)) {
    return { ok: false, error: IMAGE_ERROR };
  }
  return run(async () => {
    await requirePermission("configurar");
    const asset = await backendClient.assets.upload(
      "image",
      Buffer.from(await file.arrayBuffer()),
      { filename: file.name, contentType: file.type }
    );
    return { assetId: asset._id, url: asset.url };
  });
}
```

- [ ] **Step 4: `next.config.ts` — tamaño de subida**

Agregar dentro de `nextConfig`, después de `typescript: { ... },`:

```ts
  experimental: {
    // Brand images up to 4 MB plus form overhead.
    serverActions: { bodySizeLimit: "5mb" },
  },
```

- [ ] **Step 5: Verificar tipos y pruebas**

Run: `npm run check:permissions && npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `check-permissions: ok` y `9`.

- [ ] **Step 6: Commit**

```bash
git add lib/actionResult.ts actions/admin.ts actions/brand.ts next.config.ts
git commit -m "feat: acciones de servidor para guardar la marca y subir imágenes"
```

---

### Task 9: Pestaña Marca en el panel

**Files:**
- Modify: `lib/permissions.ts` (pestaña `marca`)
- Modify: `scripts/check-permissions.mjs`
- Modify: `components/admin/AdminButton.tsx`
- Modify: `components/Header.tsx:93-95`
- Create: `components/admin/brand/fields.tsx`
- Create: `components/admin/brand/ImageField.tsx`
- Create: `components/admin/brand/IdentitySection.tsx`
- Create: `components/admin/brand/BannerSection.tsx`
- Create: `components/admin/brand/ContactSection.tsx`
- Create: `components/admin/brand/SocialSection.tsx`
- Create: `components/admin/brand/BrandTab.tsx`

**Interfaces:**
- Consumes: `saveBrandSection`, `uploadImage` (Task 8), validadores (Task 1), `SiteSettings` (Task 3), `ActionResult` (Task 8).
- Produces: `AdminTab` incluye `"marca"`; `AdminButton` props `{ tabs: AdminTab[]; settings: SiteSettings }`; en `fields.tsx`: `INPUT`, `TextField`, `SectionCard`, `useSave(validate, action, onSaved?) => { errors, pending, save, clearErrors }` (los usa Task 10).

- [ ] **Step 1: Prueba que falla (pestañas)**

En `scripts/check-permissions.mjs` reemplazar:

```js
assert.deepEqual(adminTabs("superadmin"), ["tienda", "usuarios"]);
assert.deepEqual(adminTabs("admin"), ["tienda", "usuarios"]);
```

por:

```js
assert.deepEqual(adminTabs("superadmin"), ["tienda", "marca", "usuarios"]);
assert.deepEqual(adminTabs("admin"), ["tienda", "marca", "usuarios"]);
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run check:permissions`
Expected: FAIL `AssertionError` en `adminTabs("superadmin")`.

- [ ] **Step 3: `lib/permissions.ts`**

Reemplazar `export type AdminTab = "tienda" | "usuarios";` por `export type AdminTab = "tienda" | "marca" | "usuarios";` y `TAB_PERMISSION` por:

```ts
const TAB_PERMISSION: Record<AdminTab, Permission> = {
  tienda: "configurar",
  marca: "configurar",
  usuarios: "asignarEmpleado",
};
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm run check:permissions`
Expected: `check-permissions: ok`

- [ ] **Step 5: Crear `components/admin/brand/fields.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { ActionResult } from "@/lib/actionResult";
import { INVALID_FORM, type ValidationResult } from "@/lib/validation";

export const INPUT =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-shop_light_green/40 disabled:opacity-60";

export function TextField({
  label,
  value,
  onChange,
  error,
  max,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  max: number;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          maxLength={max}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} mt-1 resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          maxLength={max}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} mt-1`}
        />
      )}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

export function SectionCard({
  title,
  pending,
  onSave,
  children,
}: {
  title: string;
  pending: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
      {children}
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="self-start bg-shop_dark_green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </section>
  );
}

// Validates in the browser first (same rules as the server), then calls the action.
export function useSave<T>(
  validate: (input: unknown) => ValidationResult<T>,
  action: (value: T) => Promise<ActionResult<null>>,
  onSaved?: (value: T) => void
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const save = (input: unknown) => {
    const checked = validate(input);
    if (!checked.ok) {
      setErrors(checked.errors);
      toast.error(INVALID_FORM);
      return;
    }
    startTransition(async () => {
      const result = await action(checked.value);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        toast.error(result.error);
        return;
      }
      setErrors({});
      onSaved?.(checked.value);
      toast.success("Cambios guardados");
    });
  };

  return { errors, pending, save, clearErrors: () => setErrors({}) };
}
```

- [ ] **Step 6: Crear `components/admin/brand/ImageField.tsx`**

```tsx
"use client";

import { useRef, useTransition } from "react";
import toast from "react-hot-toast";
import { uploadImage } from "@/actions/brand";
import type { ImageValue } from "@/lib/brand";
import { BRAND_IMAGE_TYPES, validateImageFile } from "@/lib/validation";

const BUTTON =
  "px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60";

const ImageField = ({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: ImageValue | null;
  onChange: (value: ImageValue | null) => void;
  error?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const handleFile = (file: File) => {
    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    const data = new FormData();
    data.append("file", file);
    startTransition(async () => {
      const result = await uploadImage(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onChange(result.data);
    });
  };

  return (
    <div>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <div className="flex items-center gap-3 mt-1">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview of an uploaded asset, can be SVG
          <img src={value.url} alt="" className="h-14 w-14 object-contain rounded-lg border bg-gray-50" />
        ) : (
          <div className="h-14 w-14 rounded-lg border border-dashed bg-gray-50" />
        )}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={pending} className={BUTTON}>
          {pending ? "Subiendo…" : "Subir"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} disabled={pending} className={BUTTON}>
            Quitar
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={BRAND_IMAGE_TYPES.join(",")}
          className="hidden"
          aria-label={label}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleFile(file);
          }}
        />
      </div>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
};

export default ImageField;
```

- [ ] **Step 7: Crear `components/admin/brand/IdentitySection.tsx`**

```tsx
"use client";

import { useState } from "react";
import { saveBrandSection } from "@/actions/brand";
import type { IdentitySettings } from "@/lib/brand";
import { validateIdentity } from "@/lib/validation";
import { SectionCard, TextField, useSave } from "./fields";
import ImageField from "./ImageField";

const IdentitySection = ({ initial }: { initial: IdentitySettings }) => {
  const [value, setValue] = useState(initial);
  const { errors, pending, save } = useSave(validateIdentity, (v) =>
    saveBrandSection("identity", v)
  );
  const set = <K extends keyof IdentitySettings>(key: K, v: IdentitySettings[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));

  return (
    <SectionCard title="Identidad" pending={pending} onSave={() => save(value)}>
      <TextField label="Nombre de la tienda" value={value.storeName} onChange={(v) => set("storeName", v)} error={errors.storeName} max={60} />
      <TextField label="Eslogan" value={value.tagline} onChange={(v) => set("tagline", v)} error={errors.tagline} max={80} />
      <TextField label="Descripción" multiline value={value.description} onChange={(v) => set("description", v)} error={errors.description} max={300} />
      <fieldset>
        <legend className="text-xs font-semibold text-gray-700">Logo</legend>
        <div className="flex gap-4 mt-1 text-sm">
          {(["text", "image"] as const).map((type) => (
            <label key={type} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="logoType"
                checked={value.logoType === type}
                onChange={() => set("logoType", type)}
              />
              {type === "text" ? "Texto" : "Imagen"}
            </label>
          ))}
        </div>
        {errors.logoType && <span className="block text-xs text-red-600 mt-1">{errors.logoType}</span>}
      </fieldset>
      {value.logoType === "text" ? (
        <>
          <TextField label="Texto principal" value={value.logoText} onChange={(v) => set("logoText", v)} error={errors.logoText} max={30} />
          <TextField label="Texto secundario" value={value.logoSubtext} onChange={(v) => set("logoSubtext", v)} error={errors.logoSubtext} max={30} />
        </>
      ) : (
        <ImageField label="Imagen del logo" value={value.logoImage} onChange={(v) => set("logoImage", v)} error={errors.logoImage} />
      )}
      <ImageField label="Favicon" value={value.favicon} onChange={(v) => set("favicon", v)} error={errors.favicon} />
    </SectionCard>
  );
};

export default IdentitySection;
```

- [ ] **Step 8: Crear `components/admin/brand/BannerSection.tsx`**

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { saveBrandSection } from "@/actions/brand";
import type { BannerSettings, Cta } from "@/lib/brand";
import { MAX_STATS, validateBanner } from "@/lib/validation";
import { SectionCard, TextField, useSave } from "./fields";
import ImageField from "./ImageField";

const CTA_LABELS = { primaryCta: "Botón principal", secondaryCta: "Botón secundario" } as const;

const BannerSection = ({ initial }: { initial: BannerSettings }) => {
  const [value, setValue] = useState(initial);
  const { errors, pending, save } = useSave(validateBanner, (v) => saveBrandSection("banner", v));
  const set = <K extends keyof BannerSettings>(key: K, v: BannerSettings[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));
  const setCta = (key: keyof typeof CTA_LABELS, field: keyof Cta, v: string) =>
    setValue((prev) => ({ ...prev, [key]: { ...prev[key], [field]: v } }));
  const setStat = (i: number, field: "value" | "label", v: string) =>
    setValue((prev) => ({
      ...prev,
      stats: prev.stats.map((stat, j) => (j === i ? { ...stat, [field]: v } : stat)),
    }));

  return (
    <SectionCard title="Banner de portada" pending={pending} onSave={() => save(value)}>
      <TextField label="Etiqueta" value={value.badge} onChange={(v) => set("badge", v)} error={errors.badge} max={40} />
      <TextField label="Título" value={value.title} onChange={(v) => set("title", v)} error={errors.title} max={60} />
      <TextField label="Parte resaltada del título" value={value.highlight} onChange={(v) => set("highlight", v)} error={errors.highlight} max={30} />
      <TextField label="Subtítulo" value={value.subtitle} onChange={(v) => set("subtitle", v)} error={errors.subtitle} max={80} />
      <TextField label="Descripción" multiline value={value.description} onChange={(v) => set("description", v)} error={errors.description} max={200} />
      {(Object.keys(CTA_LABELS) as (keyof typeof CTA_LABELS)[]).map((key) => (
        <div key={key} className="grid grid-cols-2 gap-2">
          <TextField label={`${CTA_LABELS[key]}: texto`} value={value[key].label} onChange={(v) => setCta(key, "label", v)} error={errors[`${key}.label`]} max={30} />
          <TextField label="Enlace" placeholder="/shop" value={value[key].href} onChange={(v) => setCta(key, "href", v)} error={errors[`${key}.href`]} max={300} />
        </div>
      ))}
      <ImageField label="Imagen" value={value.image} onChange={(v) => set("image", v)} error={errors.image} />
      <div>
        <span className="text-xs font-semibold text-gray-700">Cifras (máximo {MAX_STATS})</span>
        {errors.stats && <span className="block text-xs text-red-600 mt-1">{errors.stats}</span>}
        {value.stats.map((stat, i) => (
          <div key={stat._key} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end mt-1">
            <TextField label="Valor" placeholder="24/7" value={stat.value} onChange={(v) => setStat(i, "value", v)} error={errors[`stats.${i}.value`]} max={10} />
            <TextField label="Etiqueta" placeholder="Soporte" value={stat.label} onChange={(v) => setStat(i, "label", v)} error={errors[`stats.${i}.label`]} max={20} />
            <button
              type="button"
              aria-label="Quitar cifra"
              onClick={() => set("stats", value.stats.filter((_, j) => j !== i))}
              className="mb-1 w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {value.stats.length < MAX_STATS && (
          <button
            type="button"
            onClick={() => set("stats", [...value.stats, { _key: crypto.randomUUID(), value: "", label: "" }])}
            className="block text-xs font-semibold text-shop_dark_green mt-2"
          >
            + Agregar cifra
          </button>
        )}
      </div>
    </SectionCard>
  );
};

export default BannerSection;
```

- [ ] **Step 9: Crear `components/admin/brand/ContactSection.tsx`**

```tsx
"use client";

import { useState } from "react";
import { saveBrandSection } from "@/actions/brand";
import type { ContactSettings } from "@/lib/brand";
import { validateContact } from "@/lib/validation";
import { SectionCard, TextField, useSave } from "./fields";

const FIELDS: { key: keyof ContactSettings; label: string; max: number }[] = [
  { key: "email", label: "Correo", max: 254 },
  { key: "phone", label: "Teléfono", max: 80 },
  { key: "address", label: "Dirección", max: 80 },
  { key: "hours", label: "Horario", max: 80 },
];

const ContactSection = ({ initial }: { initial: ContactSettings }) => {
  const [value, setValue] = useState(initial);
  const { errors, pending, save } = useSave(validateContact, (v) => saveBrandSection("contact", v));

  return (
    <SectionCard title="Contacto" pending={pending} onSave={() => save(value)}>
      <p className="text-xs text-gray-500 -mt-2">Los campos vacíos no se muestran en la tienda.</p>
      {FIELDS.map(({ key, label, max }) => (
        <TextField
          key={key}
          label={label}
          value={value[key]}
          onChange={(v) => setValue((prev) => ({ ...prev, [key]: v }))}
          error={errors[key]}
          max={max}
        />
      ))}
    </SectionCard>
  );
};

export default ContactSection;
```

- [ ] **Step 10: Crear `components/admin/brand/SocialSection.tsx`**

```tsx
"use client";

import { useState } from "react";
import { saveBrandSection } from "@/actions/brand";
import type { SocialSettings } from "@/lib/brand";
import { SOCIAL_KEYS, SOCIAL_LABELS, validateSocial } from "@/lib/validation";
import { SectionCard, TextField, useSave } from "./fields";

const SocialSection = ({ initial }: { initial: SocialSettings }) => {
  const [value, setValue] = useState(initial);
  const { errors, pending, save } = useSave(validateSocial, (v) => saveBrandSection("social", v));

  return (
    <SectionCard title="Redes sociales" pending={pending} onSave={() => save(value)}>
      <p className="text-xs text-gray-500 -mt-2">Pega el enlace de cada red que uses. Las vacías no se muestran.</p>
      {SOCIAL_KEYS.map((key) => (
        <TextField
          key={key}
          label={SOCIAL_LABELS[key]}
          placeholder="https://"
          value={value[key]}
          onChange={(v) => setValue((prev) => ({ ...prev, [key]: v }))}
          error={errors[key]}
          max={300}
        />
      ))}
    </SectionCard>
  );
};

export default SocialSection;
```

- [ ] **Step 11: Crear `components/admin/brand/BrandTab.tsx`**

```tsx
"use client";

import type { Brand } from "@/lib/brand";
import BannerSection from "./BannerSection";
import ContactSection from "./ContactSection";
import IdentitySection from "./IdentitySection";
import SocialSection from "./SocialSection";

const BrandTab = ({ initial }: { initial: Brand }) => {
  const { storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon } =
    initial;
  return (
    <div className="flex flex-col gap-8">
      <IdentitySection
        initial={{ storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon }}
      />
      <BannerSection initial={initial.banner} />
      <ContactSection initial={initial.contact} />
      <SocialSection initial={initial.social} />
    </div>
  );
};

export default BrandTab;
```

- [ ] **Step 12: `components/admin/AdminButton.tsx` — pestaña Marca y prop `settings`**

Reemplazar los imports de `ThemeKey` y `CurrencyCode` por:

```tsx
import type { SiteSettings } from "@/sanity/queries/siteSettings";
import BrandTab from "./brand/BrandTab";
```

Reemplazar `TAB_LABELS` por:

```tsx
const TAB_LABELS: Record<AdminTab, string> = {
  tienda: "Tienda",
  marca: "Marca",
  usuarios: "Usuarios",
};
```

Reemplazar la firma:

```tsx
const AdminButton = ({
  tabs,
  theme,
  currency,
}: {
  tabs: AdminTab[];
  theme: ThemeKey;
  currency: CurrencyCode;
}) => {
```

por:

```tsx
const AdminButton = ({ tabs, settings }: { tabs: AdminTab[]; settings: SiteSettings }) => {
```

Reemplazar el contenido del `tabpanel`:

```tsx
            {active === "tienda" && (
              <div className="flex flex-col gap-6">
                <AppearanceTab initialTheme={theme} />
                <CurrencySection initialCurrency={currency} />
              </div>
            )}
            {active === "usuarios" && <UsersTab />}
```

por:

```tsx
            {active === "tienda" && (
              <div className="flex flex-col gap-6">
                <AppearanceTab initialTheme={settings.theme} />
                <CurrencySection initialCurrency={settings.currency} />
              </div>
            )}
            {active === "marca" && <BrandTab initial={settings} />}
            {active === "usuarios" && <UsersTab />}
```

- [ ] **Step 13: `components/Header.tsx` — pasar la configuración**

Reemplazar:

```tsx
        <AdminButton tabs={tabs} theme={settings.theme} currency={settings.currency} />
```

por:

```tsx
        <AdminButton tabs={tabs} settings={settings} />
```

- [ ] **Step 14: Verificar tipos y pruebas**

Run: `npm run check:permissions && npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `check-permissions: ok` y `9`.

- [ ] **Step 15: Verificar en el navegador (con el usuario, sesión superadmin)**

El usuario inicia sesión (no escribir contraseñas). Luego:
1. Abrir el panel: pestañas Tienda, Marca, Usuarios.
2. Marca → Identidad: nombre "Prueba", Guardar. Toast "Cambios guardados"; encabezado "Bienvenido a Prueba" y título del navegador "Prueba — …".
3. Nombre vacío, Guardar: "Campo obligatorio" junto al campo y no se guarda.
4. Subir un PDF: "Solo JPG, PNG, WEBP o SVG de hasta 4 MB".
5. Logo tipo Imagen, subir un PNG, Guardar: el logo de imagen aparece en encabezado, pie y menú móvil.
6. Dejar todo como estaba: nombre "Ecom by Yeison", logo de texto "Ecom" + "by Yeison", sin favicon.

- [ ] **Step 16: Commit**

```bash
git add lib/permissions.ts scripts/check-permissions.mjs components/admin/AdminButton.tsx components/Header.tsx components/admin/brand
git commit -m "feat: pestaña Marca en el panel de administración"
```

---

### Task 10: Pestaña Páginas en el panel

**Files:**
- Modify: `lib/permissions.ts` (pestaña `paginas`)
- Modify: `scripts/check-permissions.mjs`
- Create: `components/admin/pages/BlockEditor.tsx`
- Create: `components/admin/pages/PagesTab.tsx`
- Modify: `components/admin/AdminButton.tsx`

**Interfaces:**
- Consumes: `savePage` (Task 8), `validatePage`, `PAGE_KEYS`, `PAGE_LABELS`, `CONTENT_ICONS`, `MAX_BLOCKS` (Task 1), `INPUT`, `TextField`, `SectionCard`, `useSave` (Task 9), `CONTENT_ICON_COMPONENTS` (Task 5).
- Produces: `AdminTab` = `"tienda" | "marca" | "paginas" | "usuarios"`; `PagesTab` props `{ initialPages: Record<PageKey, PageContent> }`.

- [ ] **Step 1: Prueba que falla (pestañas)**

En `scripts/check-permissions.mjs` reemplazar:

```js
assert.deepEqual(adminTabs("superadmin"), ["tienda", "marca", "usuarios"]);
assert.deepEqual(adminTabs("admin"), ["tienda", "marca", "usuarios"]);
```

por:

```js
assert.deepEqual(adminTabs("superadmin"), ["tienda", "marca", "paginas", "usuarios"]);
assert.deepEqual(adminTabs("admin"), ["tienda", "marca", "paginas", "usuarios"]);
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run check:permissions`
Expected: FAIL `AssertionError` en `adminTabs("superadmin")`.

- [ ] **Step 3: `lib/permissions.ts`**

`export type AdminTab = "tienda" | "marca" | "paginas" | "usuarios";` y:

```ts
const TAB_PERMISSION: Record<AdminTab, Permission> = {
  tienda: "configurar",
  marca: "configurar",
  paginas: "configurar",
  usuarios: "asignarEmpleado",
};
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm run check:permissions`
Expected: `check-permissions: ok`

- [ ] **Step 5: Crear `components/admin/pages/BlockEditor.tsx`**

```tsx
"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { ContentBlock } from "@/lib/brand";
import { CONTENT_ICONS, MAX_BLOCKS, type ContentIconKey } from "@/lib/validation";
import { CONTENT_ICON_COMPONENTS } from "@/components/contentIcons";
import { INPUT, TextField } from "../brand/fields";

const ICON_BUTTON =
  "w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40";
const ICON_KEYS = Object.keys(CONTENT_ICONS) as ContentIconKey[];

const BlockEditor = ({
  blocks,
  onChange,
  errors,
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  errors: Record<string, string>;
}) => {
  const update = (i: number, patch: Partial<ContentBlock>) =>
    onChange(blocks.map((block, j) => (j === i ? { ...block, ...patch } : block)));
  const move = (i: number, to: number) => {
    const next = [...blocks];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {errors.blocks && <p className="text-xs text-red-600">{errors.blocks}</p>}
      {blocks.map((block, i) => {
        const Icon = CONTENT_ICON_COMPONENTS[block.icon];
        return (
          <div key={block._key} className="rounded-lg border border-gray-200 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                {Icon && <Icon size={14} />} Bloque {i + 1}
              </span>
              <div className="flex gap-1">
                <button type="button" aria-label="Subir bloque" disabled={i === 0} onClick={() => move(i, i - 1)} className={ICON_BUTTON}>
                  <ArrowUp size={14} />
                </button>
                <button type="button" aria-label="Bajar bloque" disabled={i === blocks.length - 1} onClick={() => move(i, i + 1)} className={ICON_BUTTON}>
                  <ArrowDown size={14} />
                </button>
                <button type="button" aria-label="Eliminar bloque" onClick={() => onChange(blocks.filter((_, j) => j !== i))} className={ICON_BUTTON}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Ícono</span>
              <select
                value={block.icon}
                onChange={(e) => update(i, { icon: e.target.value as ContentIconKey })}
                className={`${INPUT} mt-1`}
              >
                {ICON_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {CONTENT_ICONS[key]}
                  </option>
                ))}
              </select>
              {errors[`blocks.${i}.icon`] && (
                <span className="block text-xs text-red-600 mt-1">{errors[`blocks.${i}.icon`]}</span>
              )}
            </label>
            <TextField label="Título" max={120} value={block.title} onChange={(v) => update(i, { title: v })} error={errors[`blocks.${i}.title`]} />
            <TextField label="Texto" multiline max={1000} value={block.text} onChange={(v) => update(i, { text: v })} error={errors[`blocks.${i}.text`]} />
            <TextField label="Enlace (opcional)" placeholder="/faqs" max={300} value={block.href} onChange={(v) => update(i, { href: v })} error={errors[`blocks.${i}.href`]} />
          </div>
        );
      })}
      {blocks.length < MAX_BLOCKS && (
        <button
          type="button"
          onClick={() =>
            onChange([
              ...blocks,
              { _key: crypto.randomUUID(), icon: "help-circle", title: "", text: "", href: "" },
            ])
          }
          className="self-start text-xs font-semibold text-shop_dark_green"
        >
          + Agregar bloque
        </button>
      )}
    </div>
  );
};

export default BlockEditor;
```

- [ ] **Step 6: Crear `components/admin/pages/PagesTab.tsx`**

```tsx
"use client";

import { useState } from "react";
import { savePage } from "@/actions/brand";
import type { PageContent } from "@/lib/brand";
import { PAGE_KEYS, PAGE_LABELS, validatePage, type PageKey } from "@/lib/validation";
import { INPUT, SectionCard, TextField, useSave } from "../brand/fields";
import BlockEditor from "./BlockEditor";

const PagesTab = ({ initialPages }: { initialPages: Record<PageKey, PageContent> }) => {
  const [saved, setSaved] = useState(initialPages);
  const [key, setKey] = useState<PageKey>("about");
  const [draft, setDraft] = useState<PageContent>(initialPages.about);
  const [askDiscard, setAskDiscard] = useState<PageKey | null>(null);
  const { errors, pending, save, clearErrors } = useSave(
    validatePage,
    (v) => savePage(key, v),
    (v) => {
      setSaved((prev) => ({ ...prev, [key]: v }));
      setDraft(v);
    }
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved[key]);

  const open = (next: PageKey) => {
    setKey(next);
    setDraft(saved[next]);
    setAskDiscard(null);
    clearErrors();
  };
  const choose = (next: PageKey) => {
    if (next === key) return;
    if (dirty) setAskDiscard(next);
    else open(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="block">
        <span className="text-xs font-semibold text-gray-700">Página</span>
        <select value={key} onChange={(e) => choose(e.target.value as PageKey)} className={`${INPUT} mt-1`}>
          {PAGE_KEYS.map((k) => (
            <option key={k} value={k}>
              {PAGE_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      {askDiscard && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Tienes cambios sin guardar. ¿Descartarlos?
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => open(askDiscard)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={() => setAskDiscard(null)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold"
            >
              Seguir editando
            </button>
          </div>
        </div>
      )}
      <SectionCard title={PAGE_LABELS[key]} pending={pending} onSave={() => save(draft)}>
        <TextField
          label="Introducción"
          multiline
          max={2000}
          value={draft.intro}
          onChange={(v) => setDraft((d) => ({ ...d, intro: v }))}
          error={errors.intro}
        />
        <p className="text-xs text-gray-500 -mt-2">Separa los párrafos con una línea en blanco.</p>
        <BlockEditor blocks={draft.blocks} onChange={(blocks) => setDraft((d) => ({ ...d, blocks }))} errors={errors} />
      </SectionCard>
    </div>
  );
};

export default PagesTab;
```

- [ ] **Step 7: `components/admin/AdminButton.tsx` — pestaña Páginas**

Agregar `import PagesTab from "./pages/PagesTab";`. En `TAB_LABELS` agregar `paginas: "Páginas",` después de `marca`. Después de la línea de `BrandTab` agregar:

```tsx
            {active === "paginas" && <PagesTab initialPages={settings.pages} />}
```

- [ ] **Step 8: Verificar tipos y pruebas**

Run: `npm run check:permissions && npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `check-permissions: ok` y `9`.

- [ ] **Step 9: Verificar en el navegador (con el usuario, sesión superadmin)**

1. Panel → Páginas → Términos: cambiar el título del bloque 1, bajar el bloque 1, agregar un bloque "6. Prueba", Guardar. `/terms` muestra el orden nuevo y el bloque 6.
2. Editar algo y elegir otra página sin guardar: aparece "Tienes cambios sin guardar. ¿Descartarlos?"; "Seguir editando" mantiene el texto.
3. Bloque con título vacío, Guardar: "Campo obligatorio" en ese bloque.
4. Dejar Términos como estaba: borrar el bloque 6, restaurar orden y título, Guardar.

- [ ] **Step 10: Suite completa y pruebas manuales del spec (con el usuario)**

Run: `npm run check:permissions && npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `check-permissions: ok` y `9`.

Manuales:
1. Borrar el teléfono en Marca → Contacto y guardar: desaparece "Llámenos" en el pie y en Contáctanos. Restaurarlo.
2. Contáctanos → llenar y enviar: se abre la aplicación de correo con asunto "Mensaje desde Ecom by Yeison".
3. Con un usuario empleado o cliente: no aparece el botón del panel (sin Marca ni Páginas).
4. Llamar a `saveBrandSection` desde la consola del navegador con un usuario cliente no es posible sin el botón; confirmar en el código que cada acción de `actions/brand.ts` llama `requirePermission("configurar")`.

- [ ] **Step 11: Commit**

```bash
git add lib/permissions.ts scripts/check-permissions.mjs components/admin/pages components/admin/AdminButton.tsx
git commit -m "feat: pestaña Páginas para editar el contenido por bloques"
```

---

