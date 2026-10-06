import { currentUser } from "@clerk/nextjs/server";
import {
  can,
  roleFromMetadata,
  type Permission,
  type RoleHolder,
} from "./permissions";

export const NOT_AUTHORIZED = "No autorizado";

// Reads the role from Clerk on every call, so a demoted user is rejected immediately.
export async function getActor(): Promise<RoleHolder | null> {
  const user = await currentUser();
  return user ? { id: user.id, role: roleFromMetadata(user.publicMetadata) } : null;
}

export async function requirePermission(permission: Permission): Promise<RoleHolder> {
  const actor = await getActor();
  if (!actor || !can(actor.role, permission)) throw new Error(NOT_AUTHORIZED);
  return actor;
}
