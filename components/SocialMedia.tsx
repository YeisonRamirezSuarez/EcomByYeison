"use client";

import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaPinterest,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import type { IconType } from "react-icons";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { isHttpsUrl, SOCIAL_KEYS, SOCIAL_LABELS, type SocialKey } from "@/lib/social";
import { useBrand } from "./StoreSettingsProvider";

interface Props {
  className?: string;
  iconClassName?: string;
  tooltipClassName?: string;
}

const SOCIAL_ICONS: Record<SocialKey, IconType> = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  linkedin: FaLinkedin,
  x: FaXTwitter,
  whatsapp: FaWhatsapp,
  pinterest: FaPinterest,
};

const SocialMedia = ({ className, iconClassName, tooltipClassName }: Props) => {
  const { social } = useBrand();
  const links = SOCIAL_KEYS.filter((key) => isHttpsUrl(social[key]));
  if (links.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-3.5", className)}>
        {links.map((key) => {
          const Icon = SOCIAL_ICONS[key];
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  href={social[key]}
                  aria-label={SOCIAL_LABELS[key]}
                  className={cn(
                    "p-2 border rounded-full hover:text-white hover:border-shop_light_green hoverEffect",
                    iconClassName
                  )}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent
                className={cn("bg-white text-darkColor font-semibold", tooltipClassName)}
              >
                {SOCIAL_LABELS[key]}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default SocialMedia;
