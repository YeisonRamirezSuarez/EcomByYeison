"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";
import { useBrand } from "./StoreSettingsProvider";

const Logo = ({
  className,
  spanDesign,
}: {
  className?: string;
  spanDesign?: string;
}) => {
  const { storeName, logoType, logoText, logoSubtext, logoImage } = useBrand();

  if (logoType === "image" && logoImage) {
    return (
      <Link href={"/"} className="inline-flex items-center group">
        {/* eslint-disable-next-line @next/next/no-img-element -- store logos can be SVG */}
        <img src={logoImage.url} alt={storeName} className="h-10 w-auto max-w-44 object-contain" />
      </Link>
    );
  }

  return (
    <Link href={"/"} className="inline-flex items-baseline gap-1 group">
      <h2
        className={cn(
          "text-2xl font-black tracking-tight text-shop_dark_green group-hover:text-shop_dark_green/80 hoverEffect font-sans",
          className
        )}
      >
        {logoText}
      </h2>
      {logoSubtext && (
        <span
          className={cn(
            "text-xs font-semibold text-shop_light_green group-hover:text-shop_dark_green hoverEffect tracking-widest uppercase",
            spanDesign
          )}
        >
          {logoSubtext}
        </span>
      )}
    </Link>
  );
};

export default Logo;
