"use client";

import type { Brand } from "@/lib/brand";
import BannerSection from "./BannerSection";
import ContactSection from "./ContactSection";
import IdentitySection from "./IdentitySection";
import SocialSection from "./SocialSection";

// Old side panel, removed in Task 7; sections now autosave to the draft.
const noop = { onSaved: () => {}, onError: () => {} };

const BrandTab = ({ initial }: { initial: Brand }) => {
  const { storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon } =
    initial;
  return (
    <div className="flex flex-col gap-8">
      <IdentitySection
        initial={{ storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon }}
        {...noop}
      />
      <BannerSection initial={initial.banner} {...noop} />
      <ContactSection initial={initial.contact} {...noop} />
      <SocialSection initial={initial.social} {...noop} />
    </div>
  );
};

export default BrandTab;
