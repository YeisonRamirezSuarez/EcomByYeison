import { Locale, t } from "@/lib/i18n";

export const getHeaderData = (locale: Locale) => [
  { title: t(locale, "navHome"), href: "/" },
  { title: t(locale, "navShop"), href: "/shop" },
  { title: t(locale, "navBlog"), href: "/blog" },
  { title: t(locale, "navHotDeal"), href: "/deal" },
];

export const getQuickLinksData = (locale: Locale) => [
  { title: t(locale, "linkAbout"), href: "/about" },
  { title: t(locale, "linkContact"), href: "/contact" },
  { title: t(locale, "linkTerms"), href: "/terms" },
  { title: t(locale, "linkPrivacy"), href: "/privacy" },
  { title: t(locale, "linkFaqs"), href: "/faqs" },
  { title: t(locale, "linkHelp"), href: "/help" },
];

export const getProductType = (locale: Locale) => [
  { title: t(locale, "typeGadget"), value: "gadget" },
  { title: t(locale, "categoryAppliances"), value: "appliances" },
  { title: t(locale, "typeRefrigerators"), value: "refrigerators" },
  { title: t(locale, "typeOthers"), value: "others" },
];
