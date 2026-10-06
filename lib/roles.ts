import { cache } from "react";
import { currentUser } from "@clerk/nextjs/server";
import {
  can,
  roleFromMetadata,
  type Permission,
  type RoleHolder,
} from "./permissions";

export const NOT_AUTHORIZED = "No autorizado";

// Reads the role from Clerk once per request (React cache), so a demoted user is
// rejected on their next request.
export const getActor = cache(async (): Promise<RoleHolder | null> => {
  const user = await currentUser();
  return user ? { id: user.id, role: roleFromMetadata(user.publicMetadata) } : null;
});

export async function requirePermission(permission: Permission): Promise<RoleHolder> {
  const actor = await getActor();
  if (!actor || !can(actor.role, permission)) throw new Error(NOT_AUTHORIZED);
  return actor;
}

export async function requireAnyPermission(...permissions: Permission[]): Promise<RoleHolder> {
  const actor = await getActor();
  if (!actor || !permissions.some((permission) => can(actor.role, permission))) throw new Error(NOT_AUTHORIZED);
  return actor;
}
