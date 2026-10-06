"use client";

import type { Brand } from "@/lib/brand";
import BannerSection from "./BannerSection";
import ContactSection from "./ContactSection";
import IdentitySection from "./IdentitySection";
import SocialSection from "./SocialSection";

const BrandTab = ({ initial }: { initial: Brand }) => {
  const { storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon } =
    initial;
  return (
    <div className="flex flex-col gap-8">
      <IdentitySection
        initial={{ storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon }}
      />
      <BannerSection initial={initial.banner} />
      <ContactSection initial={initial.contact} />
      <SocialSection initial={initial.social} />
    </div>
  );
};

export default BrandTab;
