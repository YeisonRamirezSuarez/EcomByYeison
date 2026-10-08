import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ClientClerkProvider from "@/components/ClientClerkProvider";
import { AdminLocaleProvider } from "@/components/admin/AdminLocaleProvider";
import AdminShell from "@/components/admin/shell/AdminShell";
import { getAdminLocale } from "@/lib/adminLocale";
import { tr } from "@/lib/adminText";
import { getActor } from "@/lib/roles";
import { adminSections } from "@/lib/permissions";

// The panel carries our brand (tab title and icon); the store keeps each client's.
export async function generateMetadata(): Promise<Metadata> {
  const ui = await getAdminLocale();
  return {
    title: { absolute: `${tr(ui, "Administración")} | Ecom by Yeison` },
    icons: { icon: [{ url: "/ecom-by-yeison.svg", type: "image/svg+xml" }] },
    robots: { index: false },
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  // ponytail: always returns to /admin after sign-in, not to the deep link.
  if (!actor) redirect("/sign-in?redirect_url=/admin");
  const sections = adminSections(actor.role);
  if (sections.length === 0) notFound();
  const [nonce, ui] = await Promise.all([headers().then((h) => h.get("x-nonce") ?? undefined), getAdminLocale()]);

  return (
    <ClientClerkProvider nonce={nonce} locale={ui}>
      <AdminLocaleProvider locale={ui}>
        <AdminShell sections={sections}>{children}</AdminShell>
      </AdminLocaleProvider>
    </ClientClerkProvider>
  );
}
