// Pure role/permission rules. No imports: also run by scripts/check-permissions.mjs.

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

export type AdminTab = "tienda" | "marca" | "paginas" | "usuarios";

export const ROLE_LABELS: Record<Role, string> = {
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

const TAB_PERMISSION: Record<AdminTab, Permission> = {
  tienda: "configurar",
  marca: "configurar",
  paginas: "configurar",
  usuarios: "asignarEmpleado",
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

export function adminTabs(role: Role): AdminTab[] {
  return (Object.keys(TAB_PERMISSION) as AdminTab[]).filter((tab) =>
    can(role, TAB_PERMISSION[tab])
  );
}
