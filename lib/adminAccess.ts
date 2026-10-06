import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/roles";
import { adminSections, type AdminSection, type RoleHolder } from "@/lib/permissions";

// Every /admin page starts here: no session -> sign in; section not allowed -> 404.
export async function requireSection(section: AdminSection): Promise<RoleHolder> {
  const actor = await getActor();
  if (!actor) redirect("/sign-in?redirect_url=/admin");
  if (!adminSections(actor.role).includes(section)) notFound();
  return actor;
}
