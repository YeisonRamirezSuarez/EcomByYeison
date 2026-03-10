import { Locale, t } from "@/lib/i18n";

export const getHeaderData = (locale: Locale) => [
  { title: t(locale, "navHome"), href: "/" },
  { title: t(locale, "navShop"), href: "/shop" },
  { title: t(locale, "navBlog"), href: "/blog" },
  { title: t(locale, "navHotDeal"), href: "/deal" },
];

export const getQuickLinksData = (locale: Locale) => [
  { title: locale === "en" ? "About us" : "Sobre nosotros", href: "/about" },
  { title: locale === "en" ? "Contact us" : "Contáctanos", href: "/contact" },
  { title: locale === "en" ? "Terms & Conditions" : "Términos y condiciones", href: "/terms" },
  { title: locale === "en" ? "Privacy Policy" : "Política de privacidad", href: "/privacy" },
  { title: locale === "en" ? "FAQs" : "Preguntas frecuentes", href: "/faqs" },
  { title: locale === "en" ? "Help" : "Ayuda", href: "/help" },
];

export const getCategoriesData = (locale: Locale) => [
  { title: t(locale, "categoryMobiles"), href: "mobiles" },
  { title: t(locale, "categoryAppliances"), href: "appliances" },
  { title: t(locale, "categorySmartphones"), href: "smartphones" },
  { title: t(locale, "categoryAirConditioners"), href: "air-conditioners" },
  { title: t(locale, "categoryWashingMachine"), href: "washing-machine" },
  { title: t(locale, "categoryKitchenAppliances"), href: "kitchen-appliances" },
  { title: t(locale, "categoryGadgetAccessories"), href: "gadget-accessories" },
];

export const getProductType = (locale: Locale) => [
  { title: t(locale, "typeGadget"), value: "gadget" },
  { title: t(locale, "categoryAppliances"), value: "appliances" },
  { title: t(locale, "typeRefrigerators"), value: "refrigerators" },
  { title: t(locale, "typeOthers"), value: "others" },
];
