import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ClientClerkProvider from "@/components/ClientClerkProvider";
import AdminShell from "@/components/admin/shell/AdminShell";
import { getActor } from "@/lib/roles";
import { adminSections } from "@/lib/permissions";

export const metadata: Metadata = { title: "Administración", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  // ponytail: always returns to /admin after sign-in, not to the deep link.
  if (!actor) redirect("/sign-in?redirect_url=/admin");
  const sections = adminSections(actor.role);
  if (sections.length === 0) notFound();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <ClientClerkProvider nonce={nonce}>
      <AdminShell sections={sections}>{children}</AdminShell>
    </ClientClerkProvider>
  );
}
