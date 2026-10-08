// Home page sections edited in Apariencia → Inicio, and how they are stored in Sanity.
// Pure: only type imports, so scripts/check-permissions.mjs can run it.
import type { ImageValue, LocalizedCta } from "./brand";
import type { Locale } from "./i18n";
import type { ValidationResult } from "./validation";
import { tr, type AdminText } from "./adminText/index.ts";

export const BUILT_IN_KINDS = ["banner", "productTabs", "categories", "brands", "blog"] as const;
export const NEW_KINDS = ["imageText", "promo", "products", "richText", "testimonials", "newsletter"] as const;
export type BuiltInKind = (typeof BUILT_IN_KINDS)[number];
export type NewKind = (typeof NEW_KINDS)[number];
export type SectionKind = BuiltInKind | NewKind;

export const SECTION_LABELS = {
  banner: "Banner principal",
  productTabs: "Productos por tipo",
  categories: "Categorías",
  brands: "Marcas",
  blog: "Blog",
  imageText: "Imagen con texto",
  promo: "Franja promocional",
  products: "Productos elegidos",
  richText: "Texto libre",
  testimonials: "Testimonios",
  newsletter: "Suscripción al boletín",
} as const satisfies Record<SectionKind, AdminText>;

export const SECTION_HINTS = {
  imageText: "Una foto con título, texto y botón.",
  promo: "Una franja de color para destacar una oferta.",
  products: "Productos de una categoría, destacados o en oferta.",
  richText: "Un bloque de texto libre.",
  testimonials: "Opiniones de tus clientes con estrellas.",
  newsletter: "Formulario para suscribirse al boletín.",
} as const satisfies Record<NewKind, AdminText>;

export const MAX_SECTIONS = 20;
export const MAX_TESTIMONIALS = 6;
export const PRODUCT_COUNTS = [4, 8, 12] as const;
export const PRODUCT_SOURCES = { category: "Una categoría", featured: "Destacados", sale: "En oferta" } as const satisfies Record<string, AdminText>;
export const PROMO_BACKGROUNDS = { primary: "Principal", accent: "Acento", secondary: "Secundario" } as const satisfies Record<string, AdminText>;
export type ProductSource = keyof typeof PRODUCT_SOURCES;
export type PromoBackground = keyof typeof PROMO_BACKGROUNDS;

export type Testimonial = { _key: string; name: string; text: string; textEn: string; rating: number; photo: ImageValue | null };

// One flat shape for every kind; each kind uses only its own fields (see STORED).
export type HomeSection = {
  _key: string;
  kind: SectionKind;
  hidden: boolean;
  title: string;
  titleEn: string;
  text: string;
  textEn: string;
  count: number | null;
  image: ImageValue | null;
  button: LocalizedCta;
  imageSide: "left" | "right";
  background: PromoBackground;
  source: ProductSource;
  category: string;
  align: "left" | "center";
  items: Testimonial[];
};

const ALL_KINDS: readonly string[] = [...BUILT_IN_KINDS, ...NEW_KINDS];
const isKind = (value: unknown): value is SectionKind => typeof value === "string" && ALL_KINDS.includes(value);
export const isBuiltIn = (kind: SectionKind): kind is BuiltInKind => (BUILT_IN_KINDS as readonly string[]).includes(kind);

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

// What the store shows while nothing was saved: today's home page.
export const DEFAULT_HOME_SECTIONS: HomeSection[] = BUILT_IN_KINDS.map((kind) => newSection(kind, kind));

// Studio edits may drop a built-in section; the editor puts it back (hidden) so the list can be saved.
export function withBuiltIns(sections: HomeSection[]): HomeSection[] {
  const keys = new Set(sections.map((s) => s._key));
  const missing = BUILT_IN_KINDS.filter((kind) => !sections.some((s) => s.kind === kind));
  return [
    ...sections,
    ...missing.map((kind) => ({ ...newSection(kind, keys.has(kind) ? `${kind}-1` : kind), hidden: true })),
  ];
}

// A section missing what it needs is kept in the editor (with ⚠) but not drawn in the store.
export function isSectionComplete(s: HomeSection): boolean {
  switch (s.kind) {
    case "imageText":
      return Boolean(s.image);
    case "promo":
      return Boolean(s.title || s.titleEn);
    case "products":
      return s.source !== "category" || Boolean(s.category);
    case "richText":
      return Boolean(s.text || s.textEn);
    case "testimonials":
      return s.items.length > 0;
    default:
      return true;
  }
}

type Errors = Record<string, string>;
const required = (ui: Locale) => tr(ui, "Campo obligatorio");
// Same text as requiredIn in lib/localize.ts (pure modules cannot import each other).
const requiredIn = (locale: Locale, ui: Locale) => tr(ui, locale === "en" ? "Campo obligatorio (inglés)" : "Campo obligatorio (español)");
// Which language a required text needs: the main one when saving, "any" when reading Sanity.
type Need = Locale | "any";
const hrefError = (ui: Locale) => tr(ui, "Usa una ruta que empiece por / o un enlace https://");
const tooLong = (max: number, ui: Locale) => tr(ui, "Máximo {max} caracteres", { max });
const KEY = /^[a-zA-Z0-9_-]{1,40}$/;
const DOC_ID = /^[a-zA-Z0-9_-]{1,100}$/;
const ASSET_ID = /^image-[a-zA-Z0-9]+-\d+x\d+-[a-z0-9]+$/;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// Same rules as isHttpsUrl / isValidHref in lib/validation.ts (pure modules cannot import each
// other at runtime); scripts/check-permissions.mjs checks they agree.
function isHttpsUrl(value: unknown): boolean {
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

function str(errors: Errors, key: string, value: unknown, max: number, ui: Locale, isRequired = false) {
  const s = typeof value === "string" ? value.trim() : "";
  if (isRequired && !s) errors[key] = required(ui);
  else if (s.length > max) errors[key] = tooLong(max, ui);
  return s;
}

// A text with an English twin ("title" + "titleEn"), optionally required (see Need).
function pair(errors: Errors, key: string, v: Record<string, unknown>, name: string, max: number, ui: Locale, need?: Need): [string, string] {
  const es = str(errors, `${key}.${name}`, v[name], max, ui);
  const en = str(errors, `${key}.${name}En`, v[`${name}En`], max, ui);
  if (need === "any") {
    if (!es && !en && !errors[`${key}.${name}`]) errors[`${key}.${name}`] = required(ui);
  } else if (need) {
    const field = `${key}.${need === "en" ? `${name}En` : name}`;
    if (!(need === "en" ? en : es) && !errors[field]) errors[field] = requiredIn(need, ui);
  }
  return [es, en];
}

function int(errors: Errors, key: string, value: unknown, min: number, max: number, ui: Locale): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= min && value <= max) return value;
  errors[key] = tr(ui, "Elige un número entre {min} y {max}", { min, max });
  return null;
}

function option<T extends string | number>(errors: Errors, key: string, value: unknown, options: readonly T[], fallback: T, ui: Locale): T {
  if (value === null || value === undefined || value === "") return fallback;
  if ((options as readonly unknown[]).includes(value)) return value as T;
  errors[key] = tr(ui, "Opción inválida");
  return fallback;
}

function image(errors: Errors, key: string, value: unknown, ui: Locale): ImageValue | null {
  if (value === null || value === undefined) return null;
  const v = asObject(value);
  if (typeof v.assetId === "string" && ASSET_ID.test(v.assetId) && isHttpsUrl(v.url)) {
    return { assetId: v.assetId, url: v.url as string };
  }
  errors[key] = tr(ui, "Imagen inválida");
  return null;
}

function button(errors: Errors, key: string, value: unknown, ui: Locale): LocalizedCta {
  const v = asObject(value);
  const label = str(errors, `${key}.label`, v.label, 30, ui);
  const labelEn = str(errors, `${key}.labelEn`, v.labelEn, 30, ui);
  const href = typeof v.href === "string" ? v.href.trim() : "";
  if (href.length > 200) errors[`${key}.href`] = tooLong(200, ui);
  else if (href && !isValidHref(href)) errors[`${key}.href`] = hrefError(ui);
  else if ((label || labelEn) && !href) errors[`${key}.href`] = required(ui);
  return { label, labelEn, href };
}

function testimonials(errors: Errors, p: string, value: unknown, need: Need, ui: Locale): Testimonial[] {
  const raw = asArray(value);
  if (raw.length > MAX_TESTIMONIALS) errors[`${p}.items`] = tr(ui, "Máximo {max} testimonios", { max: MAX_TESTIMONIALS });
  const used = new Set<string>();
  return raw.slice(0, MAX_TESTIMONIALS).map((item, j) => {
    const t = asObject(item);
    const q = `${p}.items.${j}`;
    let key = typeof t._key === "string" && KEY.test(t._key) ? t._key : `t${j}`;
    while (used.has(key)) key = `${key}x`;
    used.add(key);
    const [text, textEn] = pair(errors, q, t, "text", 300, ui, need);
    return {
      _key: key,
      name: str(errors, `${q}.name`, t.name, 60, ui, true),
      text,
      textEn,
      rating: int(errors, `${q}.rating`, t.rating, 1, 5, ui) ?? 5,
      photo: image(errors, `${q}.photo`, t.photo, ui),
    };
  });
}

function parseSection(errors: Errors, p: string, kind: SectionKind, key: string, v: Record<string, unknown>, need: Need, ui: Locale): HomeSection {
  const s = newSection(kind, key);
  s.hidden = v.hidden === true;
  const setTitle = () => ([s.title, s.titleEn] = pair(errors, p, v, "title", 80, ui));
  const setText = (max: number) => ([s.text, s.textEn] = pair(errors, p, v, "text", max, ui));
  switch (kind) {
    case "banner":
      break;
    case "productTabs":
    case "brands":
      setTitle();
      break;
    case "categories":
      setTitle();
      s.count = int(errors, `${p}.count`, v.count, 3, 12, ui) ?? 6;
      break;
    case "blog":
      setTitle();
      s.count = int(errors, `${p}.count`, v.count, 1, 6, ui);
      break;
    case "imageText":
      s.image = image(errors, `${p}.image`, v.image, ui);
      setTitle();
      setText(500);
      s.button = button(errors, `${p}.button`, v.button, ui);
      s.imageSide = option(errors, `${p}.imageSide`, v.imageSide, ["left", "right"] as const, "left", ui);
      break;
    case "promo":
      setTitle();
      setText(300);
      s.button = button(errors, `${p}.button`, v.button, ui);
      s.background = option(errors, `${p}.background`, v.background, Object.keys(PROMO_BACKGROUNDS) as PromoBackground[], "primary", ui);
      s.image = image(errors, `${p}.image`, v.image, ui);
      break;
    case "products": {
      setTitle();
      s.source = option(errors, `${p}.source`, v.source, Object.keys(PRODUCT_SOURCES) as ProductSource[], "featured", ui);
      if (s.source === "category") {
        const id = typeof v.category === "string" ? v.category : "";
        // An empty category is an incomplete section: it is saved and the store skips it.
        if (id && !DOC_ID.test(id)) errors[`${p}.category`] = tr(ui, "Categoría inválida");
        else s.category = id;
      }
      s.count = option(errors, `${p}.count`, v.count, PRODUCT_COUNTS, 8, ui);
      break;
    }
    case "richText":
      setTitle();
      setText(2000);
      s.align = option(errors, `${p}.align`, v.align, ["left", "center"] as const, "left", ui);
      break;
    case "testimonials":
      setTitle();
      s.items = testimonials(errors, p, v.items, need, ui);
      break;
    case "newsletter":
      setTitle();
      setText(300);
      break;
  }
  return s;
}

function parseSections(input: unknown[], errors: Errors, need: Need, ui: Locale): HomeSection[] {
  const keys = new Set<string>();
  const builtIns = new Set<SectionKind>();
  const sections: HomeSection[] = [];
  input.slice(0, MAX_SECTIONS).forEach((raw, i) => {
    const v = asObject(raw);
    const p = `sections.${i}`;
    const key = typeof v._key === "string" && KEY.test(v._key) ? v._key : "";
    if (!key || keys.has(key)) errors[`${p}._key`] = tr(ui, "Sección repetida o inválida");
    keys.add(key);
    if (!isKind(v.kind)) {
      errors[`${p}.kind`] = tr(ui, "Tipo de sección desconocido");
      return;
    }
    if (isBuiltIn(v.kind)) {
      if (builtIns.has(v.kind)) errors[`${p}.kind`] = tr(ui, "Esta sección ya está en el inicio");
      builtIns.add(v.kind);
    }
    sections.push(parseSection(errors, p, v.kind, key, v, need, ui));
  });
  return sections;
}

export function validateHomeSections(input: unknown, primary: Locale = "es", ui: Locale = "es"): ValidationResult<HomeSection[]> {
  const errors: Errors = {};
  if (!Array.isArray(input)) return { ok: false, errors: { sections: tr(ui, "Lista de secciones inválida") } };
  if (input.length > MAX_SECTIONS) errors.sections = tr(ui, "Máximo {max} secciones", { max: MAX_SECTIONS });
  const sections = parseSections(input, errors, primary, ui);
  const missing = BUILT_IN_KINDS.filter((kind) => !sections.some((s) => s.kind === kind));
  if (missing.length > 0) errors.sections = tr(ui, "Faltan secciones: {list}", { list: missing.map((k) => tr(ui, SECTION_LABELS[k])).join(", ") });
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: sections };
}

// Lenient read of what Sanity has (Studio edits skip validation): sections that do not pass
// are dropped. null = never saved, or nothing usable left; the store then shows DEFAULT_HOME_SECTIONS.
export function readHomeSections(raw: unknown): HomeSection[] | null {
  if (!Array.isArray(raw)) return null;
  const keys = new Set<string>();
  const builtIns = new Set<SectionKind>();
  const out: HomeSection[] = [];
  for (const item of raw.slice(0, MAX_SECTIONS)) {
    const errors: Errors = {};
    const [section] = parseSections([item], errors, "any", "es");
    if (!section || Object.keys(errors).length > 0 || keys.has(section._key)) continue;
    if (isBuiltIn(section.kind) && builtIns.has(section.kind)) continue;
    keys.add(section._key);
    if (isBuiltIn(section.kind)) builtIns.add(section.kind);
    out.push(section);
  }
  return out.length > 0 ? out : null;
}

// Fields each kind stores in Sanity.
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

const sanityImage = (img: ImageValue) => ({ _type: "image", asset: { _type: "reference", _ref: img.assetId } });

// Validated sections → Sanity array. Category references are weak, so deleting a category is
// never blocked by the home page (the section just stops showing).
export function homeSectionsWrite(sections: HomeSection[]) {
  const images: ImageValue[] = [];
  const categories = new Set<string>();
  const homeSections = sections.map((s) => {
    const out: Record<string, unknown> = { _key: s._key, _type: "homeSection", kind: s.kind, hidden: s.hidden };
    for (const field of STORED[s.kind]) {
      if (field === "image") {
        if (s.image) {
          out.image = sanityImage(s.image);
          images.push(s.image);
        }
      } else if (field === "category") {
        if (s.category) {
          out.category = { _type: "reference", _ref: s.category, _weak: true };
          categories.add(s.category);
        }
      } else if (field === "items") {
        out.items = s.items.map(({ photo, ...t }) => {
          if (photo) images.push(photo);
          return { ...t, _type: "testimonial", ...(photo ? { photo: sanityImage(photo) } : {}) };
        });
      } else if (s[field] !== null) {
        out[field] = s[field];
      }
    }
    return out;
  });
  return { homeSections, images, categories: [...categories] };
}

// Field errors for sections whose category no longer exists (index = position in the saved list).
export function categoryErrors(sections: unknown, missing: string[], ui: Locale = "es"): Record<string, string> {
  const errors: Errors = {};
  asArray(sections).forEach((raw, i) => {
    const category = asObject(raw).category;
    if (typeof category === "string" && missing.includes(category)) errors[`sections.${i}.category`] = tr(ui, "Esa categoría ya no existe");
  });
  return errors;
}
