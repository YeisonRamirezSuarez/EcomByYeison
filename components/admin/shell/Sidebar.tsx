"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ExternalLink } from "lucide-react";
import type { AdminSection } from "@/lib/permissions";
import { useBrand } from "@/components/StoreSettingsProvider";
import { NAV_GROUPS, SECTION_PATHS } from "./nav";

const isActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

const Sidebar = ({
  sections,
  open,
  onNavigate,
}: {
  sections: AdminSection[];
  open: boolean;
  onNavigate: () => void;
}) => {
  const pathname = usePathname();
  const { storeName, logoType, logoImage } = useBrand();

  return (
    <aside
      className={`fixed md:sticky top-0 left-0 z-50 h-dvh w-64 shrink-0 bg-shop_dark_green text-white/80 flex flex-col transition-transform md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
        {logoType === "image" && logoImage ? (
          <Image src={logoImage.url} alt={storeName} width={28} height={28} className="rounded-md bg-white object-contain" unoptimized />
        ) : (
          <span className="w-7 h-7 rounded-md bg-shop_orange flex items-center justify-center text-white font-black text-sm">
            {storeName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="font-bold text-white truncate">{storeName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5" aria-label="Administración">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => sections.includes(item.section));
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">{group.title}</p>
              <ul className="flex flex-col gap-0.5">
                {items.map(({ section, label, icon: Icon }) => {
                  const href = SECTION_PATHS[section];
                  const active = isActive(pathname, href);
                  return (
                    <li key={section}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          active ? "bg-white/15 text-white font-semibold" : "hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon size={18} className={active ? "text-shop_orange" : undefined} />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 flex items-center justify-between gap-2">
        <UserButton />
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium hover:text-white"
        >
          Ver tienda <ExternalLink size={14} />
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
