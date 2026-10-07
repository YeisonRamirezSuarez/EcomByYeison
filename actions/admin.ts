"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { updateTag } from "next/cache";
import { isCurrencyCode } from "@/constants/currencies";
import { languagesFromChoice } from "@/lib/localize";
import {
  assignableRoles,
  canAssignRole,
  isRole,
  roleFromMetadata,
  type Role,
} from "@/lib/permissions";
import { NOT_AUTHORIZED, requirePermission } from "@/lib/roles";
import { run, type ActionResult } from "@/lib/actionResult";
import { backendClient } from "@/sanity/lib/backendClient";
import { SITE_SETTINGS_DRAFT_ID, SITE_SETTINGS_ID, SITE_SETTINGS_TAG, hasAppearanceDraft } from "@/sanity/queries/siteSettings";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  assignable: Role[];
};

export type UserPage = { users: AdminUser[]; totalCount: number; pageSize: number };

const PAGE_SIZE = 20;

async function saveSetting(field: "currency", value: string) {
  await backendClient.createIfNotExists({
    _id: SITE_SETTINGS_ID,
    _type: "siteSettings",
  });
  await backendClient.patch(SITE_SETTINGS_ID).set({ [field]: value }).commit();
  updateTag(SITE_SETTINGS_TAG);
}

export async function saveCurrency(currency: string): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    if (!isCurrencyCode(currency)) throw new Error("Moneda inválida");
    await saveSetting("currency", currency);
    return null;
  });
}

// Saved like the currency (not through the appearance draft). Also copied onto the draft when
// there is one, so the appearance editor and its preview see the new languages.
export async function saveLanguages(choice: string, primary: string): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    const picked = languagesFromChoice(choice, primary);
    if (!picked) throw new Error("Idiomas inválidos");
    const fields = { languages: picked.languages, defaultLocale: picked.primary };
    const tx = backendClient
      .transaction()
      .createIfNotExists({ _id: SITE_SETTINGS_ID, _type: "siteSettings" })
      .patch(SITE_SETTINGS_ID, { set: fields });
    if (await hasAppearanceDraft()) tx.patch(SITE_SETTINGS_DRAFT_ID, { set: fields });
    await tx.commit();
    updateTag(SITE_SETTINGS_TAG);
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
