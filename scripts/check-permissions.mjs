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
assert.deepEqual(adminTabs("superadmin"), ["tienda", "usuarios"]);
assert.deepEqual(adminTabs("admin"), ["tienda", "usuarios"]);
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

console.log("check-permissions: ok");
