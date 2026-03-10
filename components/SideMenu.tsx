"use client";

import React, { FC } from "react";
import Logo from "./Logo";
import { X } from "lucide-react";
import { getHeaderData } from "@/constants/data";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SocialMedia from "./SocialMedia";
import { useOutsideClick } from "@/hooks";
import useStore from "@/store";
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SideMenu: FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { locale } = useStore();
  const headerData = getHeaderData(locale);
  const sidebarRef = useOutsideClick<HTMLDivElement>(onClose);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-y-0 h-screen left-0 z-50 w-full bg-gray-900/20 backdrop-blur-sm ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } hoverEffect`}
    >
      <div
        ref={sidebarRef}
        className="min-w-72 max-w-96 bg-white h-screen p-6 sm:p-8 border-r border-gray-200 flex flex-col gap-6 overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-5 border-b border-gray-200 pb-4">
          <Logo />
          <button
            onClick={onClose}
            className="text-darkColor hover:text-shop_dark_green hoverEffect p-1"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col space-y-2 font-semibold tracking-wide">
          {headerData?.map((item) => (
            <Link
              href={item?.href}
              key={item?.title}
              onClick={onClose}
              className={`px-3 py-2.5 rounded-lg hover:bg-gray-100 hoverEffect ${
                pathname === item?.href ? "text-shop_dark_green bg-green-50" : "text-darkColor"
              }`}
            >
              {item?.title}
            </Link>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-4 mt-auto">
          <SocialMedia className="text-darkColor/60" iconClassName="border-gray-300 hover:border-shop_light_green" />
        </div>
      </div>
    </div>
  );
};

export default SideMenu;
