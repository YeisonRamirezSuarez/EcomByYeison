"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";
import { isThemeKey } from "@/constants/themes";
import {
  assignableRoles,
  canAssignRole,
  isRole,
  roleFromMetadata,
  type Role,
} from "@/lib/permissions";
import { NOT_AUTHORIZED, requirePermission } from "@/lib/roles";
import { backendClient } from "@/sanity/lib/backendClient";
import { SITE_SETTINGS_ID, SITE_SETTINGS_TAG } from "@/sanity/queries/siteSettings";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  assignable: Role[];
};

export type UserPage = { users: AdminUser[]; totalCount: number; pageSize: number };

const PAGE_SIZE = 20;

// Server action errors are redacted in production, so return a result object instead of throwing.
async function run<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
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

export async function saveTheme(theme: string): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    if (!isThemeKey(theme)) throw new Error("Tema inválido");
    await backendClient.createIfNotExists({
      _id: SITE_SETTINGS_ID,
      _type: "siteSettings",
    });
    await backendClient.patch(SITE_SETTINGS_ID).set({ theme }).commit();
    revalidateTag(SITE_SETTINGS_TAG);
    return null;
  });
}

export async function listUsers(
  query: string,
  page: number
): Promise<ActionResult<UserPage>> {
  return run(async () => {
    const actor = await requirePermission("asignarEmpleado");
    const safePage = Number.isInteger(page) && page >= 0 ? page : 0;
    const clerk = await clerkClient();
    const { data, totalCount } = await clerk.users.getUserList({
      query: query.trim() || undefined,
      limit: PAGE_SIZE,
      offset: safePage * PAGE_SIZE,
      orderBy: "-created_at",
    });
    const users = data.map((user) => {
      const role = roleFromMetadata(user.publicMetadata);
      return {
        id: user.id,
        name: user.fullName ?? "",
        email: user.primaryEmailAddress?.emailAddress ?? "",
        role,
        assignable: assignableRoles(actor, { id: user.id, role }),
      };
    });
    return { users, totalCount, pageSize: PAGE_SIZE };
  });
}

export async function setUserRole(
  targetId: string,
  newRole: string
): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requirePermission("asignarEmpleado");
    if (!isRole(newRole)) throw new Error(NOT_AUTHORIZED);
    const clerk = await clerkClient();
    const target = await clerk.users.getUser(targetId);
    const targetRole = roleFromMetadata(target.publicMetadata);
    if (!canAssignRole(actor, { id: target.id, role: targetRole }, newRole)) {
      throw new Error(NOT_AUTHORIZED);
    }
    await clerk.users.updateUserMetadata(target.id, {
      publicMetadata: { role: newRole },
    });
    return null;
  });
}
