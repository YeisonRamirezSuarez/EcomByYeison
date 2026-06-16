import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";
import Image from "next/image";

const Logo = ({
  className,
  spanDesign,
}: {
  className?: string;
  spanDesign?: string;
}) => {
  return (
    <Link href={"/"} className="inline-flex items-center gap-2 group">
      <Image
        src="/logo.svg"
        alt="Ecom by Yeison"
        width={40}
        height={40}
        className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300"
      />
      <div className="flex items-baseline gap-1">
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
      </div>
    </Link>
  );
};

export default Logo;
