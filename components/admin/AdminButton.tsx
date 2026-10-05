"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AdminTab } from "@/lib/permissions";
import type { ThemeKey } from "@/constants/themes";
import AppearanceTab from "./AppearanceTab";
import UsersTab from "./UsersTab";

const TAB_LABELS: Record<AdminTab, string> = {
  apariencia: "Apariencia",
  usuarios: "Usuarios",
};

const AdminButton = ({ tabs, theme }: { tabs: AdminTab[]; theme: ThemeKey }) => {
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
      <DialogContent
        aria-describedby={undefined}
        className="top-0 right-0 left-auto translate-x-0 translate-y-0 h-dvh w-full max-w-md sm:max-w-md rounded-none border-l p-0 gap-0 flex flex-col bg-white"
      >
        <div className="px-5 py-4 border-b">
          <DialogTitle className="font-bold text-gray-900">Administración</DialogTitle>
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
        <div className="flex-1 overflow-y-auto p-5">
          {active === "apariencia" && <AppearanceTab initialTheme={theme} />}
          {active === "usuarios" && <UsersTab />}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminButton;
