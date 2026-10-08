// Pure role/permission rules. Imports only a type: also run by scripts/check-permissions.mjs.
import type { AdminText } from "./adminText/index.ts";

export const ROLES = ["superadmin", "admin", "empleado", "cliente"] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "comprar"
  | "pedidos"
  | "productos"
  | "catalogo"
  | "configurar"
  | "asignarEmpleado"
  | "asignarAdmin";

export type RoleHolder = { id: string; role: Role };

export type AdminSection =
  | "inicio"
  | "pedidos"
  | "productos"
  | "categorias"
  | "marcas"
  | "apariencia"
  | "paginas"
  | "boletin"
  | "usuarios"
  | "ajustes";

export const ROLE_LABELS: Record<Role, AdminText> = {
  superadmin: "Superadmin",
  admin: "Administrador",
  empleado: "Empleado",
  cliente: "Cliente",
};

const PERMISSIONS: Record<Role, readonly Permission[]> = {
  superadmin: [
    "comprar",
    "pedidos",
    "productos",
    "catalogo",
    "configurar",
    "asignarEmpleado",
    "asignarAdmin",
  ],
  admin: [
    "comprar",
    "pedidos",
    "productos",
    "catalogo",
    "configurar",
    "asignarEmpleado",
  ],
  empleado: ["comprar", "pedidos", "productos"],
  cliente: ["comprar"],
};

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

export function roleFromMetadata(metadata: unknown): Role {
  const role = (metadata as { role?: unknown } | null | undefined)?.role;
  return isRole(role) ? role : "cliente";
}

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}

export function assignableRoles(actor: RoleHolder, target: RoleHolder): Role[] {
  if (actor.id === target.id || target.role === "superadmin") return [];
  if (can(actor.role, "asignarAdmin")) return ["cliente", "empleado", "admin"];
  if (can(actor.role, "asignarEmpleado") && target.role !== "admin") {
    return ["cliente", "empleado"];
  }
  return [];
}

export function canAssignRole(
  actor: RoleHolder,
  target: RoleHolder,
  newRole: Role
): boolean {
  return assignableRoles(actor, target).includes(newRole);
}

// Menu order of the /admin dashboard; each section needs one permission.
const SECTION_PERMISSION: Record<AdminSection, Permission> = {
  inicio: "pedidos",
  pedidos: "pedidos",
  productos: "productos",
  categorias: "catalogo",
  marcas: "catalogo",
  apariencia: "configurar",
  paginas: "configurar",
  boletin: "configurar",
  usuarios: "asignarEmpleado",
  ajustes: "configurar",
};

export function adminSections(role: Role): AdminSection[] {
  return (Object.keys(SECTION_PERMISSION) as AdminSection[]).filter((section) =>
    can(role, SECTION_PERMISSION[section])
  );
}
