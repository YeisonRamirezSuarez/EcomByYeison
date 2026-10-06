// Store identity types. Only type imports: also run by scripts/check-permissions.mjs.
import type { ContentIconKey, PageKey, SocialKey } from "./validation";

export type ImageValue = { assetId: string; url: string };
export type Cta = { label: string; href: string };
export type Stat = { _key: string; value: string; label: string };

export type BannerSettings = {
  badge: string;
  title: string;
  highlight: string;
  subtitle: string;
  description: string;
  primaryCta: Cta;
  secondaryCta: Cta;
  image: ImageValue | null;
  stats: Stat[];
};

export type ContactSettings = { email: string; phone: string; address: string; hours: string };
export type SocialSettings = Record<SocialKey, string>;

export type ContentBlock = {
  _key: string;
  icon: ContentIconKey;
  title: string;
  text: string;
  href: string;
};
export type PageContent = { intro: string; blocks: ContentBlock[] };

export type IdentitySettings = {
  storeName: string;
  tagline: string;
  description: string;
  logoType: "text" | "image";
  logoText: string;
  logoSubtext: string;
  logoImage: ImageValue | null;
  favicon: ImageValue | null;
};

export type Brand = IdentitySettings & {
  banner: BannerSettings;
  contact: ContactSettings;
  social: SocialSettings;
  pages: Record<PageKey, PageContent>;
};

export type BrandSection = "identity" | "banner" | "contact" | "social";
