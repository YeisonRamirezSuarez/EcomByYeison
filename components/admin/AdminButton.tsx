"use client";

import { useState } from "react";
import { Settings, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AdminTab } from "@/lib/permissions";
import type { SiteSettings } from "@/sanity/queries/siteSettings";
import BrandTab from "./brand/BrandTab";
import PagesTab from "./pages/PagesTab";
import OrdersTab from "./OrdersTab";
import AppearanceTab from "./AppearanceTab";
import CurrencySection from "./CurrencySection";
import UsersTab from "./UsersTab";

const TAB_LABELS: Record<AdminTab, string> = {
  tienda: "Tienda",
  marca: "Marca",
  paginas: "Páginas",
  pedidos: "Pedidos",
  usuarios: "Usuarios",
};

const AdminButton = ({ tabs, settings }: { tabs: AdminTab[]; settings: SiteSettings }) => {
  const [active, setActive] = useState<AdminTab>(tabs[0]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white bg-shop_dark_green transition-all hover:scale-110 active:scale-95"
          title="Administración"
          aria-label="Abrir panel de administración"
        >
          <Settings size={20} />
        </button>
      </DialogTrigger>
      <DialogPortal>
        {/* Light overlay so palette changes stay visible behind the panel. */}
        <DialogOverlay className="bg-black/20" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-0 right-0 z-50 h-dvh w-full max-w-md flex flex-col bg-white border-l shadow-2xl"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <DialogTitle className="font-bold text-gray-900">Administración</DialogTitle>
            <DialogPrimitive.Close
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500"
              aria-label="Cerrar panel"
            >
              <X size={14} />
            </DialogPrimitive.Close>
          </div>
          <div className="flex gap-1 px-5 border-b" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={active === tab}
                onClick={() => setActive(tab)}
                className={`px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  active === tab
                    ? "border-shop_dark_green text-shop_dark_green"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-5" role="tabpanel">
            {active === "tienda" && (
              <div className="flex flex-col gap-6">
                <AppearanceTab initialTheme={settings.theme} />
                <CurrencySection initialCurrency={settings.currency} />
              </div>
            )}
            {active === "marca" && <BrandTab initial={settings} />}
            {active === "paginas" && <PagesTab initialPages={settings.pages} />}
            {active === "pedidos" && <OrdersTab />}
            {active === "usuarios" && <UsersTab />}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default AdminButton;
