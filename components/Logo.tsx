import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";

const Logo = ({
  className,
  spanDesign,
}: {
  className?: string;
  spanDesign?: string;
}) => {
  return (
    <Link href={"/"} className="inline-flex items-baseline gap-1 group">
      <h2
        className={cn(
          "text-2xl font-black tracking-tight text-shop_dark_green group-hover:text-shop_dark_green/80 hoverEffect font-sans",
          className
        )}
      >
        Ecom
      </h2>
      <span
        className={cn(
          "text-xs font-semibold text-shop_light_green group-hover:text-shop_dark_green hoverEffect tracking-widest uppercase",
          spanDesign
        )}
      >
        by Yeison
      </span>
    </Link>
  );
};

export default Logo;
