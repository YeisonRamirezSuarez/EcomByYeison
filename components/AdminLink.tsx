"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { LayoutDashboard } from "lucide-react";
import { adminSections, roleFromMetadata } from "@/lib/permissions";

// Staff shortcut to the panel. Only a link: /admin checks the role on the server.
const AdminLink = () => {
  const { user } = useUser();
  if (!user || adminSections(roleFromMetadata(user.publicMetadata)).length === 0) return null;
  return (
    <Link href="/admin" title="Administrar" aria-label="Administrar" className="hover:text-shop_light_green hoverEffect">
      <LayoutDashboard size={20} />
    </Link>
  );
};

export default AdminLink;
