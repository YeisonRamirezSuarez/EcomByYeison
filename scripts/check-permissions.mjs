// Run: npm run check:permissions
import assert from "node:assert/strict";
import {
  assignableRoles,
  can,
  canAssignRole,
  roleFromMetadata,
} from "../lib/permissions.ts";

// roleFromMetadata
assert.equal(roleFromMetadata(undefined), "cliente");
assert.equal(roleFromMetadata(null), "cliente");
assert.equal(roleFromMetadata({}), "cliente");
assert.equal(roleFromMetadata({ role: "hacker" }), "cliente");
assert.equal(roleFromMetadata({ role: "admin" }), "admin");

// Permission table
const table = {
  comprar: ["superadmin", "admin", "empleado", "cliente"],
  pedidos: ["superadmin", "admin", "empleado"],
  productos: ["superadmin", "admin", "empleado"],
  catalogo: ["superadmin", "admin"],
  configurar: ["superadmin", "admin"],
  asignarEmpleado: ["superadmin", "admin"],
  asignarAdmin: ["superadmin"],
};
for (const [permission, allowed] of Object.entries(table)) {
  for (const role of ["superadmin", "admin", "empleado", "cliente"]) {
    assert.equal(can(role, permission), allowed.includes(role), `${role} ${permission}`);
  }
}

// Role assignment
const superadmin = { id: "s", role: "superadmin" };
const admin = { id: "a", role: "admin" };
const otherAdmin = { id: "a2", role: "admin" };
const empleado = { id: "e", role: "empleado" };
const cliente = { id: "c", role: "cliente" };

assert.deepEqual(assignableRoles(superadmin, cliente), ["cliente", "empleado", "admin"]);
assert.deepEqual(assignableRoles(superadmin, admin), ["cliente", "empleado", "admin"]);
assert.deepEqual(assignableRoles(admin, cliente), ["cliente", "empleado"]);
assert.deepEqual(assignableRoles(admin, empleado), ["cliente", "empleado"]);
assert.deepEqual(assignableRoles(admin, otherAdmin), []);
assert.deepEqual(assignableRoles(admin, superadmin), []);
assert.deepEqual(assignableRoles(superadmin, { id: "s2", role: "superadmin" }), []);
assert.deepEqual(assignableRoles(admin, admin), []); // self
assert.deepEqual(assignableRoles(superadmin, superadmin), []); // self
assert.deepEqual(assignableRoles(empleado, cliente), []);
assert.deepEqual(assignableRoles(cliente, empleado), []);

assert.equal(canAssignRole(admin, cliente, "empleado"), true);
assert.equal(canAssignRole(admin, cliente, "admin"), false);
assert.equal(canAssignRole(admin, cliente, "superadmin"), false);
assert.equal(canAssignRole(superadmin, cliente, "admin"), true);
assert.equal(canAssignRole(superadmin, cliente, "superadmin"), false);
assert.equal(canAssignRole(admin, admin, "cliente"), false);

// Themes
const { THEMES, isThemeKey, themeCssVars } = await import("../constants/themes.ts");
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
assert.equal(isThemeKey("ocean"), true);
assert.equal(isThemeKey("desconocido"), false);
assert.equal(isThemeKey(undefined), false);
assert.equal(themeCssVars("ocean")["--color-shop_dark_green"], "#0c2d57");
assert.deepEqual(themeCssVars("desconocido"), themeCssVars("emerald"));
assert.equal(Object.keys(themeCssVars("emerald")).length, 8);

// Currencies
const { isCurrencyCode, formatPrice, priceRanges, parsePriceRange } = await import(
  "../constants/currencies.ts"
);
const nbsp = (s) => s.replace(/ /g, " ");
assert.equal(isCurrencyCode("COP"), true);
assert.equal(isCurrencyCode("cop"), false);
assert.equal(isCurrencyCode(undefined), false);
assert.equal(formatPrice(1250, "USD"), "$1,250.00");
assert.equal(nbsp(formatPrice(1250000, "COP")), "$ 1.250.000");
assert.equal(nbsp(formatPrice(1250000.6, "COP")), "$ 1.250.001");
assert.equal(formatPrice(undefined, "USD"), "$0.00");
assert.equal(formatPrice(5, "desconocida"), "$5.00"); // falls back to USD
assert.equal(formatPrice(99, "USD", 0), "$99");
assert.deepEqual(
  priceRanges("USD").map((r) => r.value),
  ["0-100", "100-200", "200-300", "300-500", "500-"]
);
assert.deepEqual(priceRanges("USD").map((r) => r.title), [
  "Menos de $100",
  "$100 - $200",
  "$200 - $300",
  "$300 - $500",
  "Más de $500",
]);
assert.deepEqual(
  priceRanges("COP").map((r) => r.value),
  ["0-400000", "400000-800000", "800000-1200000", "1200000-2000000", "2000000-"]
);
assert.equal(nbsp(priceRanges("COP")[0].title), "Menos de $ 400.000");
assert.deepEqual(parsePriceRange(null), { minPrice: 0, maxPrice: null });
assert.deepEqual(parsePriceRange("100-200"), { minPrice: 100, maxPrice: 200 });
assert.deepEqual(parsePriceRange("2000000-"), { minPrice: 2000000, maxPrice: null });
assert.deepEqual(parsePriceRange("basura"), { minPrice: 0, maxPrice: null });

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

// Stripe sends lowercase currency codes; emails format them in uppercase.
assert.equal(nbsp(formatPrice(1250000, "cop".toUpperCase())), "$ 1.250.000");
assert.equal(formatPrice(1250000, "cop"), "$1,250,000.00"); // lowercase falls back to USD: callers must uppercase

// Admin dashboard sections
const perms = await import("../lib/permissions.ts");
const ALL_SECTIONS = ["inicio", "pedidos", "productos", "categorias", "marcas", "apariencia", "paginas", "usuarios", "ajustes"];
assert.deepEqual(perms.adminSections("superadmin"), ALL_SECTIONS);
assert.deepEqual(perms.adminSections("admin"), ALL_SECTIONS);
assert.deepEqual(perms.adminSections("empleado"), ["inicio", "pedidos", "productos"]);
assert.deepEqual(perms.adminSections("cliente"), []);

// Appearance publish: only appearance fields, removed images are unset
const brandMod = await import("../lib/brand.ts");
const rawDraft = {
  _id: "drafts.siteSettings", _rev: "r1", _type: "siteSettings", _updatedAt: "2026-10-06",
  theme: "sand", storeName: "Nike", banner: { title: "Hola" }, contact: { email: "a@b.co" },
  social: { instagram: "" }, logoImage: { asset: { _ref: "image-1" } },
  currency: "COP", pages: { about: { intro: "x" } },
};
assert.deepEqual(brandMod.pickAppearance(rawDraft), {
  theme: "sand", storeName: "Nike", banner: { title: "Hola" }, contact: { email: "a@b.co" },
  social: { instagram: "" }, logoImage: { asset: { _ref: "image-1" } },
});
assert.deepEqual(brandMod.pickAppearance({}), {});
assert.equal(brandMod.APPEARANCE_FIELDS.includes("currency"), false);
assert.equal(brandMod.APPEARANCE_FIELDS.includes("pages"), false);
const patch = brandMod.appearancePatch(rawDraft);
assert.equal("currency" in patch.set, false);
assert.equal("pages" in patch.set, false);
assert.ok(patch.unset.includes("favicon"));
assert.ok(patch.unset.includes("tagline"));
assert.equal(patch.unset.includes("logoImage"), false);
assert.equal(patch.unset.includes("currency"), false);

// Dashboard
const dash = await import("../lib/dashboard.ts");
assert.equal(
  dash.monthSales(
    [
      { totalPrice: 100, currency: "usd" },
      { totalPrice: 50, currency: "USD" },
      { totalPrice: 999, currency: "cop" },
      { totalPrice: null, currency: "usd" },
      { currency: null },
    ],
    "USD"
  ),
  150
);
assert.equal(dash.monthSales([], "COP"), 0);
assert.equal(dash.monthStart(new Date("2026-10-06T15:00:00Z")), "2026-10-01T00:00:00.000Z");
assert.equal(dash.monthStart(new Date("2026-01-31T23:59:00Z")), "2026-01-01T00:00:00.000Z");

// Order status and filters
const os = await import("../lib/orderStatus.ts");
assert.deepEqual([...os.ORDER_STATUSES], ["pending", "paid", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"]);
assert.equal(os.statusLabel("out_for_delivery"), "En reparto");
assert.equal(os.statusLabel("raro"), "raro");
assert.equal(os.statusLabel(undefined), "—");
const orderRows = [
  { _id: "1", orderNumber: "ABC-1", customerName: "Ana Torres", email: "ana@x.co", status: "paid" },
  { _id: "2", orderNumber: "XYZ-2", customerName: "Luis", email: "LUIS@Y.CO", status: "delivered" },
  { _id: "3", status: "paid" },
];
const ids = (list) => list.map((o) => o._id);
assert.deepEqual(ids(os.filterOrders(orderRows, "all", "")), ["1", "2", "3"]);
assert.deepEqual(ids(os.filterOrders(orderRows, "paid", "")), ["1", "3"]);
assert.deepEqual(ids(os.filterOrders(orderRows, "all", "luis@y")), ["2"]);
assert.deepEqual(ids(os.filterOrders(orderRows, "all", "  abc ")), ["1"]);
assert.deepEqual(ids(os.filterOrders(orderRows, "all", "TORRES")), ["1"]);
assert.deepEqual(ids(os.filterOrders(orderRows, "delivered", "ana")), []);
assert.deepEqual(os.countByStatus(orderRows), {
  all: 3, pending: 0, paid: 2, processing: 0, shipped: 0, out_for_delivery: 0, delivered: 1, cancelled: 0,
});

assert.equal("adminTabs" in perms, false);

// Preview request detection: the param, or any navigation inside the editor's iframe.
const { wantsPreview } = await import("../lib/preview.ts");
assert.equal(wantsPreview(new URLSearchParams("vista-previa=1"), null), true);
assert.equal(wantsPreview(new URLSearchParams(""), "iframe"), true);
assert.equal(wantsPreview(new URLSearchParams(""), "document"), false);
assert.equal(wantsPreview(new URLSearchParams("vista-previa=0"), null), false);

// Draft saves run one at a time, in order, and flush() fires pending debounced saves.
const { createSaveQueue } = await import("../lib/saveQueue.ts");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
{
  const q = createSaveQueue();
  const done = [];
  const a = q.run(async () => { await wait(30); done.push("A"); });
  const b = q.run(async () => { done.push("B"); });
  await Promise.all([a, b]);
  assert.deepEqual(done, ["A", "B"]);

  await q.run(async () => { throw new Error("x"); }).catch(() => {});
  assert.equal(await q.run(async () => "after"), "after");

  const fired = [];
  q.schedule(async () => { await wait(20); fired.push("late"); }, 10_000);
  const cancel = q.schedule(async () => { fired.push("cancelled"); }, 10_000);
  cancel();
  await q.flush();
  assert.deepEqual(fired, ["late"]);
}

// /shop filters live in the URL.
const sf = await import("../lib/shopFilters.ts");
assert.deepEqual(sf.readShopFilters({}), { category: null, brand: null, price: null });
assert.deepEqual(sf.readShopFilters({ category: "audio", price: "0-100" }), { category: "audio", brand: null, price: "0-100" });
assert.deepEqual(sf.readShopFilters({ brand: ["a", "b"], category: "" }), { category: null, brand: "a", price: null });
assert.equal(sf.shopHref("", "category", "audio"), "/shop?category=audio");
assert.equal(sf.shopHref("category=audio&price=0-100", "brand", "sony"), "/shop?category=audio&price=0-100&brand=sony");
assert.equal(sf.shopHref("category=audio&brand=sony", "brand", null), "/shop?category=audio");
assert.equal(sf.shopHref("category=audio&brand=sony&price=1-&utm=x", "all", null), "/shop?utm=x");
assert.equal(sf.shopHref("category=audio", "all", null), "/shop");
// Two quick clicks: the second builds on the first query, not on the URL still on screen.
assert.equal(sf.shopQuery(sf.shopQuery("", "category", "headphones"), "price", "0-100"), "category=headphones&price=0-100");

// Catalog rules (products, categories, brands).
const cat = await import("../lib/catalog.ts");
assert.equal(cat.slugify("Audífonos Bluetooth  Pro!"), "audifonos-bluetooth-pro");
assert.equal(cat.slugify("  --Ñandú__ 2025-- "), "nandu-2025");
assert.equal(cat.slugify("a".repeat(120)).length, 96);
assert.equal(cat.isValidSlug("tv-55-pulgadas"), true);
assert.equal(cat.isValidSlug("TV"), false);
assert.equal(cat.isValidSlug("a--b"), false);
assert.equal(cat.isValidSlug("-a"), false);
assert.equal(cat.isDocId("4f1c2b7e-9a1d-4c3e-8f00-1234567890ab"), true);
assert.equal(cat.isDocId("drafts.abc"), false);
assert.equal(cat.isDocId("../x"), false);
assert.equal(cat.isDocId(""), false);

const IMG = { assetId: "image-abc123-800x600-png", url: "https://cdn.sanity.io/images/p/d/abc123-800x600.png" };
const goodProduct = {
  name: " Parlante ", slug: "parlante", images: [IMG, IMG], description: "", price: "10.5", discount: "", stock: "3",
  categories: ["cat1", "cat1", "cat2"], brand: "", status: "hot", variant: "gadget", isFeatured: true,
};
const vp = cat.validateProduct(goodProduct);
assert.equal(vp.ok, true);
assert.deepEqual(vp.value, {
  name: "Parlante", slug: "parlante", images: [IMG], description: "", price: 10.5, discount: 0, stock: 3,
  categories: ["cat1", "cat2"], brand: null, status: "hot", variant: "gadget", isFeatured: true,
});
const bad = cat.validateProduct({
  name: "", slug: "Mal Slug", images: Array(11).fill(IMG).map((im, i) => ({ ...im, assetId: `image-a${i}-1x1-png` })),
  description: "x".repeat(2001), price: "-1", discount: "101", stock: "1.5", categories: ["ok", "../bad"], brand: "../b",
  status: "otro", variant: "otro",
});
assert.equal(bad.ok, false);
for (const key of ["name", "slug", "images", "description", "price", "discount", "stock", "categories", "brand", "status", "variant"]) {
  assert.ok(bad.errors[key], `product error ${key}`);
}
assert.equal(cat.validateProduct({ ...goodProduct, price: "" }).errors.price, "Campo obligatorio");
assert.equal(cat.validateProduct({ ...goodProduct, status: "", variant: "" }).value.status, null);

const vc = cat.validateCategory({ title: "Audio", slug: "audio", description: "", range: "", featured: true, image: null });
assert.deepEqual(vc.value, { title: "Audio", slug: "audio", description: "", range: null, featured: true, image: null });
const badCat = cat.validateCategory({ title: "", slug: "x y", description: "d".repeat(501), range: "-3", image: { assetId: "nope" } });
for (const key of ["title", "slug", "description", "range", "image"]) assert.ok(badCat.errors[key], `category error ${key}`);
const vb = cat.validateBrand({ title: "Sony", slug: "sony", description: "Japón", image: IMG });
assert.deepEqual(vb.value, { title: "Sony", slug: "sony", description: "Japón", image: IMG });
assert.equal(cat.validateBrand({ title: "x".repeat(81), slug: "sony" }).errors.title, "Máximo 80 caracteres");

const pw = cat.productWrite(vp.value);
assert.deepEqual(pw.set.slug, { _type: "slug", current: "parlante" });
assert.deepEqual(pw.set.images, [{ _key: "img0", _type: "image", asset: { _type: "reference", _ref: IMG.assetId } }]);
assert.deepEqual(pw.set.categories, [
  { _key: "cat0", _type: "reference", _ref: "cat1" },
  { _key: "cat1", _type: "reference", _ref: "cat2" },
]);
assert.deepEqual(pw.unset, ["brand"]);
assert.equal("brand" in pw.set, false);
const cw = cat.categoryWrite(vc.value);
assert.deepEqual(cw.unset, ["range", "image"]);
assert.deepEqual(cat.brandWrite(vb.value).set.image, { _type: "image", asset: { _type: "reference", _ref: IMG.assetId } });

assert.equal(cat.publishedStock(10, 10, 7), 7); // untouched in the draft: keep real stock (3 sold)
assert.equal(cat.publishedStock(20, 10, 7), 20); // edited in the draft: use it
assert.equal(cat.publishedStock(5, undefined, undefined), 5); // new product: no base, nothing published
assert.equal(cat.publishedStock(58, undefined, 53), 53); // Studio draft (no base): keep real stock
assert.equal(cat.publishedStock(10, 10, undefined), 10); // published had no stock

// Base for the draft's stock: published stock for a new draft, the draft's own stock for a
// Studio draft without one, nothing when it already has one.
assert.equal(cat.stockBaseFor(null, { stock: 10 }), 10);
assert.equal(cat.stockBaseFor(null, null), undefined);
assert.equal(cat.stockBaseFor({ stock: 58 }, { stock: 53 }), 58);
assert.equal(cat.stockBaseFor({ stock: 58, stockBase: 50 }, { stock: 53 }), undefined);
assert.equal(cat.stockBaseFor({}, { stock: 53 }), undefined);

// Publishing over an existing product only lands if nobody (an order) changed it since we read it.
const pwm = { set: { name: "A" }, unset: ["brand"] };
assert.deepEqual(cat.publishMutations("p1", pwm, 7, { _rev: "r1" }), [
  { patch: { id: "p1", ifRevisionID: "r1", set: { name: "A", stock: 7 }, unset: ["brand", "stockBase"] } },
  { delete: { id: "drafts.p1" } },
]);
assert.deepEqual(cat.publishMutations("p1", pwm, 7, null), [
  { create: { name: "A", _id: "p1", _type: "product", stock: 7, archived: false } },
  { delete: { id: "drafts.p1" } },
]);

assert.equal(cat.productState({ hasPublished: true, hasDraft: false, archived: false }), "publicado");
assert.equal(cat.productState({ hasPublished: false, hasDraft: true, archived: false }), "borrador");
assert.equal(cat.productState({ hasPublished: true, hasDraft: true, archived: false }), "por-publicar");
assert.equal(cat.productState({ hasPublished: true, hasDraft: true, archived: true }), "archivado");

const rows = cat.mergeProductRows([
  { _id: "a", name: "Viejo", price: 1, stock: 2, image: null, _updatedAt: "2026-01-01" },
  { _id: "drafts.a", name: "Nuevo nombre", price: 3, stock: 2, image: "u", _updatedAt: "2026-03-01" },
  { _id: "b", name: "Archivado", price: 5, archived: true, _updatedAt: "2026-02-01" },
  { _id: "drafts.c", name: "Solo borrador", _updatedAt: "2026-01-15" },
]);
assert.deepEqual(rows.map((r) => [r.id, r.name, r.state]), [
  ["a", "Nuevo nombre", "por-publicar"],
  ["b", "Archivado", "archivado"],
  ["c", "Solo borrador", "borrador"],
]);
assert.deepEqual(rows.find((r) => r.id === "c"), { id: "c", name: "Solo borrador", price: 0, stock: 0, image: null, state: "borrador", updatedAt: "2026-01-15" });
assert.deepEqual(cat.filterProducts(rows, "activos", "").map((r) => r.id), ["a", "c"]);
assert.deepEqual(cat.filterProducts(rows, "por-publicar", "").map((r) => r.id), ["a", "c"]);
assert.deepEqual(cat.filterProducts(rows, "archivados", "").map((r) => r.id), ["b"]);
assert.deepEqual(cat.filterProducts(rows, "activos", "  NUEVO ").map((r) => r.id), ["a"]);

// A product with a draft counts once; singular when it is one.
assert.equal(cat.usesLabel(1), "La usa 1 producto");
assert.equal(cat.usesLabel(3), "La usan 3 productos");
assert.deepEqual(
  cat.countUses([
    { _id: "p1", refs: ["c1", "b1"] },
    { _id: "drafts.p1", refs: ["c1", "c2"] },
    { _id: "p2", refs: ["c1", null] },
  ]),
  { c1: 2, b1: 1, c2: 1 }
);

// Hotspot/crop set in Studio survive a save from the panel.
const HOT = { _type: "sanity.imageHotspot", x: 0.3, y: 0.4, height: 0.5, width: 0.5 };
const CROP = { _type: "sanity.imageCrop", top: 0.1, bottom: 0, left: 0, right: 0 };
const extras = cat.imageExtras([
  { _key: "k", _type: "image", asset: { _ref: IMG.assetId }, hotspot: HOT, crop: CROP },
  { _type: "image", asset: { _ref: "image-other-10x10-png" } },
  null,
]);
assert.deepEqual(extras, { [IMG.assetId]: { hotspot: HOT, crop: CROP } });
assert.deepEqual(cat.imageExtras(undefined), {});
assert.deepEqual(cat.productWrite(vp.value, extras).set.images, [
  { _key: "img0", _type: "image", asset: { _type: "reference", _ref: IMG.assetId }, hotspot: HOT, crop: CROP },
]);

// Checkout charges what Sanity says, never what the browser sends.
const ck = await import("../lib/checkout.ts");
const SERVER = [{ _id: "p1", name: "Parlante", price: 10, description: "x", images: [] }];
assert.deepEqual(ck.checkoutLines([{ id: "p1", quantity: 2 }], SERVER), { ok: true, lines: [{ product: SERVER[0], quantity: 2 }] });
assert.deepEqual(ck.checkoutLines([{ id: "p1", quantity: 1 }, { id: "gone", quantity: 1 }], SERVER), { ok: false, missing: ["gone"] });
assert.equal(ck.checkoutLines([{ id: "p1", quantity: 0 }], SERVER).ok, false);
assert.equal(ck.checkoutLines([{ id: "p1", quantity: 1.5 }], SERVER).ok, false);
assert.equal(ck.checkoutLines([], SERVER).ok, false);
assert.equal(ck.checkoutLines([{ id: "p1", quantity: 1 }], [{ ...SERVER[0], price: null }]).ok, false);

// Home sections (Apariencia → Inicio)
{
  const hs = await import("../lib/homeSections.ts");
  const IMG = { assetId: "image-abc123-800x600-jpg", url: "https://cdn.sanity.io/images/p/d/abc123-800x600.jpg" };
  const DEF = hs.DEFAULT_HOME_SECTIONS;

  // Defaults: today's 5 sections, today's order and titles
  assert.deepEqual(DEF.map((s) => s.kind), ["banner", "productTabs", "categories", "brands", "blog"]);
  assert.equal(DEF[2].title, "Categorías populares");
  assert.equal(DEF[2].count, 6);
  assert.equal(DEF[3].title, "Compra por marca");
  assert.equal(DEF[4].title, "Últimas entradas");
  assert.equal(DEF[4].count, null);
  assert.ok(hs.validateHomeSections(DEF).ok);

  // Built-ins: never removed, never repeated
  assert.ok(hs.validateHomeSections(DEF.slice(1)).errors.sections);
  assert.ok(hs.validateHomeSections([...DEF, { ...DEF[0], _key: "otro" }]).errors["sections.5.kind"]);
  // Keys and kinds
  assert.ok(hs.validateHomeSections([...DEF, hs.newSection("richText", "banner")]).errors["sections.5._key"]);
  assert.ok(hs.validateHomeSections([...DEF, { _key: "x", kind: "html" }]).errors["sections.5.kind"]);
  assert.ok(hs.validateHomeSections("nope").errors.sections);
  // Limit
  const many = [...DEF, ...Array.from({ length: 16 }, (_, i) => hs.newSection("newsletter", `n${i}`))];
  assert.equal(many.length, 21);
  assert.ok(hs.validateHomeSections(many).errors.sections);

  const withSection = (s) => hs.validateHomeSections([...DEF, s]);
  const it = { ...hs.newSection("imageText", "it1"), image: IMG, title: "Nueva", text: "Hola", button: { label: "Ver", href: "/shop" }, imageSide: "right" };
  const okIt = withSection(it);
  assert.ok(okIt.ok);
  assert.deepEqual(okIt.value[5], it);
  assert.ok(withSection({ ...it, title: "x".repeat(81) }).errors["sections.5.title"]);
  assert.ok(withSection({ ...it, button: { label: "Ver", href: "" } }).errors["sections.5.button.href"]);
  for (const bad of ["//evil.com", "javascript:alert(1)", "http://a.co"]) {
    assert.ok(withSection({ ...it, button: { label: "Ver", href: bad } }).errors["sections.5.button.href"], bad);
  }
  assert.ok(withSection({ ...it, imageSide: "top" }).errors["sections.5.imageSide"]);
  assert.ok(withSection({ ...it, image: { assetId: "x", url: "https://a.co" } }).errors["sections.5.image"]);
  // Same href rule as lib/validation.ts
  for (const href of ["/shop", "//x", "/\\x", "https://a.co/x", "http://a.co", "javascript:x", "ftp://a"]) {
    assert.equal(hs.isValidHref(href), v.isValidHref(href), href);
  }

  // Counts
  assert.ok(hs.validateHomeSections(DEF.map((s) => (s.kind === "categories" ? { ...s, count: 13 } : s))).errors["sections.2.count"]);
  assert.ok(hs.validateHomeSections(DEF.map((s) => (s.kind === "blog" ? { ...s, count: 7 } : s))).errors["sections.4.count"]);
  assert.equal(hs.validateHomeSections(DEF.map((s) => (s.kind === "blog" ? { ...s, count: 3 } : s))).value[4].count, 3);

  // Products: category required for source "category", ids only, counts 4/8/12
  const prod = { ...hs.newSection("products", "p1"), source: "category", category: "" };
  assert.ok(withSection(prod).errors["sections.5.category"]);
  assert.ok(withSection({ ...prod, category: "drafts.x" }).errors["sections.5.category"]);
  assert.ok(withSection({ ...prod, category: "cat1", count: 5 }).errors["sections.5.count"]);
  assert.ok(withSection({ ...prod, category: "cat1" }).ok);
  assert.equal(withSection({ ...prod, source: "featured", category: "cat1" }).value[5].category, "");
  assert.ok(withSection({ ...prod, source: "todo" }).errors["sections.5.source"]);

  // Testimonials
  const tm = { ...hs.newSection("testimonials", "t1"), items: [{ _key: "a", name: "Ana", text: "Excelente", rating: 5, photo: null }] };
  assert.ok(withSection(tm).ok);
  assert.ok(withSection({ ...tm, items: Array.from({ length: 7 }, (_, i) => ({ ...tm.items[0], _key: `a${i}` })) }).errors["sections.5.items"]);
  assert.ok(withSection({ ...tm, items: [{ ...tm.items[0], rating: 6 }] }).errors["sections.5.items.0.rating"]);
  assert.ok(withSection({ ...tm, items: [{ ...tm.items[0], name: "" }] }).errors["sections.5.items.0.name"]);
  assert.ok(withSection({ ...tm, items: [{ ...tm.items[0], text: "x".repeat(301) }] }).errors["sections.5.items.0.text"]);

  // Promo / rich text / newsletter limits
  assert.ok(withSection({ ...hs.newSection("promo", "pr"), title: "Oferta", background: "rojo" }).errors["sections.5.background"]);
  assert.ok(withSection({ ...hs.newSection("richText", "rt"), text: "x".repeat(2001) }).errors["sections.5.text"]);
  assert.ok(withSection({ ...hs.newSection("newsletter", "nl"), text: "x".repeat(301) }).errors["sections.5.text"]);

  // Complete = shown in the store
  assert.equal(hs.isSectionComplete(hs.newSection("imageText", "a")), false);
  assert.equal(hs.isSectionComplete(it), true);
  assert.equal(hs.isSectionComplete(hs.newSection("promo", "a")), false);
  assert.equal(hs.isSectionComplete({ ...hs.newSection("promo", "a"), title: "Oferta" }), true);
  assert.equal(hs.isSectionComplete(hs.newSection("richText", "a")), false);
  assert.equal(hs.isSectionComplete({ ...hs.newSection("richText", "a"), text: "Hola" }), true);
  assert.equal(hs.isSectionComplete(hs.newSection("testimonials", "a")), false);
  assert.equal(hs.isSectionComplete(tm), true);
  assert.equal(hs.isSectionComplete(hs.newSection("products", "a")), true);
  assert.equal(hs.isSectionComplete({ ...hs.newSection("products", "a"), source: "category" }), false);
  assert.equal(hs.isSectionComplete(hs.newSection("newsletter", "a")), true);
  for (const s of DEF) assert.equal(hs.isSectionComplete(s), true, s.kind);

  // Lenient read of what Sanity has (Studio edits skip validation)
  assert.equal(hs.readHomeSections(undefined), null);
  assert.equal(hs.readHomeSections(null), null);
  const stored = [
    { _key: "banner", kind: "banner", hidden: null, title: null, items: null, button: null },
    { _key: "x1", kind: "html" },
    { _key: "x2", kind: "imageText", image: IMG, button: { label: "Ver", href: "javascript:alert(1)" } },
    { _key: "banner", kind: "richText", text: "clave repetida" },
    { _key: "b2", kind: "banner" },
    { _key: "rt", kind: "richText", text: "Hola", align: null, title: null, count: null },
  ];
  const read = hs.readHomeSections(stored);
  assert.deepEqual(read.map((s) => s._key), ["banner", "rt"]);
  assert.equal(read[0].hidden, false);
  assert.equal(read[1].align, "left");
  // Missing built-ins come back hidden in the editor, so the list validates
  const restored = hs.withBuiltIns(read);
  assert.deepEqual(restored.map((s) => s.kind), ["banner", "richText", "productTabs", "categories", "brands", "blog"]);
  assert.ok(restored.slice(2).every((s) => s.hidden));
  assert.ok(hs.validateHomeSections(restored).ok);
  assert.deepEqual(hs.withBuiltIns(DEF), DEF);

  // Sanity write: weak category refs, images collected, empty optional fields skipped
  const w = hs.homeSectionsWrite([it, { ...prod, category: "cat1" }, tm, DEF[4], DEF[0]]);
  assert.deepEqual(w.homeSections[0], {
    _key: "it1", _type: "homeSection", kind: "imageText", hidden: false,
    image: { _type: "image", asset: { _type: "reference", _ref: IMG.assetId } },
    title: "Nueva", text: "Hola", button: { label: "Ver", href: "/shop" }, imageSide: "right",
  });
  assert.deepEqual(w.homeSections[1].category, { _type: "reference", _ref: "cat1", _weak: true });
  assert.equal(w.homeSections[2].items[0]._type, "testimonial");
  assert.equal("photo" in w.homeSections[2].items[0], false);
  assert.equal("count" in w.homeSections[3], false);
  assert.deepEqual(w.homeSections[4], { _key: "banner", _type: "homeSection", kind: "banner", hidden: false });
  assert.deepEqual(w.images, [IMG]);
  assert.deepEqual(w.categories, ["cat1"]);

  // Deleted category → error on that section's field
  assert.deepEqual(hs.categoryErrors([DEF[0], { ...prod, category: "gone" }, { ...prod, _key: "p2", category: "cat1" }], ["gone"]), {
    "sections.1.category": "Esa categoría ya no existe",
  });
  assert.deepEqual(hs.categoryErrors("nope", ["gone"]), {});
}

// Store styles (Apariencia → Estilos)
{
  const st = await import("../lib/styles.ts");
  assert.deepEqual(st.validateStyles({}).value, st.DEFAULT_STYLES);
  assert.deepEqual(st.validateStyles(undefined).value, st.DEFAULT_STYLES);
  assert.deepEqual(st.DEFAULT_STYLES, { colors: {}, headingFont: "poppins", bodyFont: "poppins", corners: "soft", buttons: "filled" });
  const full = { colors: { primary: "#112233", button: "#AABBCC" }, headingFont: "playfair", bodyFont: "inter", corners: "round", buttons: "outline" };
  assert.deepEqual(st.validateStyles(full).value, { ...full, colors: { primary: "#112233", button: "#aabbcc" } });
  assert.ok(st.validateStyles({ colors: { primary: "red" } }).errors["colors.primary"]);
  assert.ok(st.validateStyles({ colors: { primary: "#12345" } }).errors["colors.primary"]);
  assert.ok(st.validateStyles({ headingFont: "comic" }).errors.headingFont);
  assert.ok(st.validateStyles({ bodyFont: "toString" }).errors.bodyFont);
  assert.ok(st.validateStyles({ corners: "x" }).errors.corners);
  assert.ok(st.validateStyles({ buttons: "x" }).errors.buttons);
  // Lenient read: bad fields fall back, good ones stay
  assert.deepEqual(st.readStyles({ headingFont: "comic", colors: { primary: "red", accent: "#FF0000" } }), { ...st.DEFAULT_STYLES, colors: { accent: "#ff0000" } });
  assert.deepEqual(st.readStyles(null), st.DEFAULT_STYLES);
  assert.equal(st.fontVar("dmSans"), "var(--font-f-dmSans)");

  // Palette only = today's colors, radius and Poppins
  const base = themeCssVars("coral");
  const pure = st.styleCssVars(base, st.DEFAULT_STYLES);
  for (const [key, val] of Object.entries(base)) assert.equal(pure[key], val, key);
  assert.equal(pure["--radius"], "0.625rem");
  assert.equal(pure["--radius-2xl"], "1rem");
  assert.equal(pure["--store-font-heading"], "var(--font-f-poppins)");
  assert.equal(pure["--store-font-body"], "var(--font-f-poppins)");
  // Own colors override; soft tones are derived from them
  const own = st.styleCssVars(base, {
    ...st.DEFAULT_STYLES,
    colors: { accent: "#000000", background: "#ffffff", primary: "#000000" },
    corners: "square",
    headingFont: "playfair",
  });
  assert.equal(own["--color-shop_orange"], "#000000");
  assert.equal(own["--color-lightOrange"], "#b3b3b3");
  assert.equal(own["--color-deal-bg"], "#b3b3b3");
  assert.equal(own["--color-shop_light_pink"], "#ffffff");
  assert.equal(own["--color-shop_light_bg"], "#f0f0f0");
  assert.equal(own["--color-shop_btn_dark_green"], base["--color-shop_btn_dark_green"]);
  assert.equal(own["--radius"], "0rem");
  assert.equal(own["--radius-3xl"], "0rem");
  assert.equal(own["--store-font-heading"], "var(--font-f-playfair)");
  assert.equal(st.styleCssVars(base, { ...st.DEFAULT_STYLES, corners: "round" })["--radius"], "1rem");

  // Colors math
  assert.equal(st.mixHex("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(Math.round(st.contrastRatio("#ffffff", "#000000")), 21);
  assert.equal(st.contrastRatio("#9a3412", "#9a3412"), 1);
  assert.equal(st.contrastRatio("#000000", "#ffffff"), st.contrastRatio("#ffffff", "#000000"));
  assert.ok(st.contrastRatio("#ffffff", "#9a3412") >= st.MIN_CONTRAST);
  assert.ok(st.contrastRatio("#ffffff", "#fde68a") < st.MIN_CONTRAST);
}

console.log("check-permissions: ok");
