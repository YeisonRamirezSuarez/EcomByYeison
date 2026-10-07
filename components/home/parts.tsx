import Link from "next/link";
import { cn } from "@/lib/utils";
import { isValidHref } from "@/lib/homeSections";
import type { Cta } from "@/lib/brand";

export const SectionTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={cn("text-2xl font-bold text-darkColor", className)}>{children}</h2>
);

// Studio edits skip panel validation, so unsafe links are dropped here too.
export const SectionButton = ({ button, inverted = false }: { button: Cta; inverted?: boolean }) =>
  button.label && isValidHref(button.href) ? (
    <Link
      href={button.href}
      className={cn(
        "inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold hoverEffect",
        inverted ? "bg-white text-darkColor hover:bg-white/90" : "btn-primary bg-shop_btn_dark_green text-white hover:bg-shop_btn_dark_green/90"
      )}
    >
      {button.label}
    </Link>
  ) : null;
