"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import type { AdminSection } from "@/lib/permissions";
import { useBrand } from "@/components/StoreSettingsProvider";
import Sidebar from "./Sidebar";

const AdminShell = ({ sections, children }: { sections: AdminSection[]; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { storeName } = useBrand();

  return (
    <div className="min-h-dvh bg-shop_light_pink md:flex">
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-shop_dark_green text-white">
        <span className="font-bold truncate">{storeName}</span>
        <button type="button" aria-label="Abrir menú" onClick={() => setOpen(true)}>
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
