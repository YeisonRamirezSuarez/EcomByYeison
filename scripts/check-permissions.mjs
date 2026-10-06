// Run: npm run check:permissions
import assert from "node:assert/strict";
import {
  adminTabs,
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

// Admin tabs
assert.deepEqual(adminTabs("superadmin"), ["tienda", "marca", "paginas", "usuarios"]);
assert.deepEqual(adminTabs("admin"), ["tienda", "marca", "paginas", "usuarios"]);
assert.deepEqual(adminTabs("empleado"), []);
assert.deepEqual(adminTabs("cliente"), []);

// Themes
const { THEMES, isThemeKey, themeCssVars } = await import("../constants/themes.ts");
assert.deepEqual(Object.keys(THEMES), ["emerald", "ocean", "violet", "crimson", "rose", "slate"]);
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

console.log("check-permissions: ok");
