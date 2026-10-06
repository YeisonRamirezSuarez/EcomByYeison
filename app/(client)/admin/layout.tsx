import { notFound } from "next/navigation";
import React from "react";
import { getActor } from "@/lib/roles";
import { can } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor || !can(actor.role, "pedidos")) notFound();
  return <>{children}</>;
}
