"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import type { AdminSection } from "@/lib/permissions";
import PanelBrand from "./PanelBrand";
import Sidebar from "./Sidebar";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";

const AdminShell = ({ sections, children }: { sections: AdminSection[]; children: React.ReactNode }) => {
  const ui = useAdminLocale();
  const [open, setOpen] = useState(false);

  return (
    // data-admin-shell: the panel keeps its own fonts and corners (app/globals.css).
    <div data-admin-shell="" className="min-h-dvh bg-shop_light_pink md:flex">
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-shop_dark_green text-white">
        <PanelBrand />
        <button type="button" aria-label={tr(ui, "Abrir menú")} onClick={() => setOpen(true)}>
          <Menu size={22} />
        </button>
      </header>
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setOpen(false)} />
      )}
      <Sidebar sections={sections} open={open} onNavigate={() => setOpen(false)} />
      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
};

export default AdminShell;
