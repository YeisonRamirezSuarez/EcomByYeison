import React from "react";
import Container from "./Container";
import Logo from "./Logo";
import SocialMedia from "./SocialMedia";
import NewsletterForm from "./NewsletterForm";
import { SubText, SubTitle } from "./ui/text";
import { getQuickLinksData } from "@/constants/data";
import Link from "next/link";
import { getLocalizedSettings } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { getCategories } from "@/sanity/queries";
import { Category } from "@/sanity.types";
import { isEmail } from "@/lib/validation";

const Footer = async () => {
  const { storeName, description, contact, locale } = await getLocalizedSettings();
  const quickLinksData = getQuickLinksData(locale);
  // Real categories from Sanity, only those that actually have products so the
  // footer never links to an empty category. getCategories adds productCount.
  const allCategories: (Category & { productCount?: number })[] =
    await getCategories();
  const categoriesData = allCategories.filter(
    (c) => (c.productCount ?? 0) > 0
  );
  // Contact comes from siteSettings; empty fields are hidden.
  const contactItems = [
    {
      title: t(locale, "footerVisitUs"),
      value: contact.address,
      href: `https://maps.google.com/?q=${encodeURIComponent(contact.address)}`,
      icon: <MapPin className="h-3.5 w-3.5 text-shop_dark_green" />,
    },
    {
      title: t(locale, "footerCallUs"),
      value: contact.phone,
      href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
      icon: <Phone className="h-3.5 w-3.5 text-shop_dark_green" />,
    },
    {
      title: t(locale, "footerSchedule"),
      value: contact.hours,
      href: undefined,
      icon: <Clock className="h-3.5 w-3.5 text-shop_dark_green" />,
    },
    {
      title: t(locale, "footerWriteUs"),
      value: contact.email,
      href: isEmail(contact.email) ? `mailto:${contact.email}` : undefined,
      icon: <Mail className="h-3.5 w-3.5 text-shop_dark_green" />,
    },
  ].filter((item) => item.value);

  return (
    <footer
      id="site-footer"
      className="border-t border-gray-200 bg-gradient-to-b from-white to-gray-50/70"
    >
      <Container className="py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-7">
          <div className="space-y-3 lg:col-span-5">
            <Logo />
            {/* Marketing copy & contact details add a lot of height on phones;
                keep the mobile footer minimal (logo + social + quick links). */}
            {description && (
              <SubText className="hidden md:block leading-6 text-[13px]">{description}</SubText>
            )}
            <SocialMedia
              className="text-darkColor/60 gap-2.5"
              iconClassName="border-gray-300 hover:border-shop_light_green hover:text-shop_light_green p-1.5"
              tooltipClassName="bg-darkColor text-white"
            />
            {contactItems.length > 0 && (
              <ul className="hidden md:block space-y-1.5 pt-1">
                {contactItems.map((item) => (
                  <li key={item.title} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="mt-0.5">{item.icon}</span>
                    <span className="font-medium text-gray-700">{item.title}:</span>
                    {item.href ? (
                      <Link
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="hover:text-shop_dark_green hoverEffect"
                      >
                        {item.value}
                      </Link>
                    ) : (
                      <span>{item.value}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-2">
            <SubTitle className="text-sm uppercase tracking-wider text-gray-700">{t(locale, "footerQuickLinks")}</SubTitle>
            <ul className="space-y-2 mt-3 text-sm">
              {quickLinksData?.map((item) => (
                <li key={item?.title}>
                  <Link href={item?.href} className="text-gray-600 hover:text-shop_light_green hoverEffect font-medium">
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden md:block lg:col-span-2">
            <SubTitle className="text-sm uppercase tracking-wider text-gray-700">{t(locale, "footerCategories")}</SubTitle>
            <ul className="space-y-2 mt-3 text-sm">
              {categoriesData?.map((item) => (
                <li key={item?._id}>
                  <Link href={`/category/${item?.slug?.current}`} className="text-gray-600 hover:text-shop_light_green hoverEffect font-medium capitalize">
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden md:block space-y-3 lg:col-span-3">
            <SubTitle className="text-sm uppercase tracking-wider text-gray-700">{t(locale, "footerNewsletter")}</SubTitle>
            <SubText className="leading-6 text-[13px]">{t(locale, "footerNewsletterDesc")}</SubText>
            <NewsletterForm storeName={storeName} locale={locale} />
            <div className="inline-flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-shop_dark_green" />
              <span>{t(locale, "footerNewsletterNote")}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200/80 flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between text-xs md:text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} <strong className="text-gray-700">{storeName}</strong>. {t(locale, "footerCopyright")}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-shop_light_green hoverEffect">{t(locale, "footerPrivacy")}</Link>
            <Link href="/terms" className="hover:text-shop_light_green hoverEffect">{t(locale, "footerTerms")}</Link>
            <Link href="/help" className="hover:text-shop_light_green hoverEffect">{t(locale, "footerHelpCenter")}</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
