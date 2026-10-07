"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import type { AdminSection } from "@/lib/permissions";
import PanelBrand from "./PanelBrand";
import Sidebar from "./Sidebar";

// The store's fonts and corners (Apariencia → Estilos) live on <html>; the panel keeps its own.
const PANEL_STYLE = {
  fontFamily: "var(--font-f-poppins), sans-serif",
  "--store-font-heading": "var(--font-f-poppins)",
  "--radius": "0.625rem",
  "--radius-2xl": "1rem",
  "--radius-3xl": "1.5rem",
} as React.CSSProperties;

const AdminShell = ({ sections, children }: { sections: AdminSection[]; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-shop_light_pink md:flex" style={PANEL_STYLE}>
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-shop_dark_green text-white">
        <PanelBrand />
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
