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
assert.deepEqual(adminTabs("superadmin"), ["apariencia", "usuarios"]);
assert.deepEqual(adminTabs("admin"), ["apariencia", "usuarios"]);
assert.deepEqual(adminTabs("empleado"), []);
assert.deepEqual(adminTabs("cliente"), []);

console.log("check-permissions: ok");
