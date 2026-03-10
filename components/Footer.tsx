import React from "react";
import Container from "./Container";
import FooterTop from "./FooterTop";
import Logo from "./Logo";
import SocialMedia from "./SocialMedia";
import { SubText, SubTitle } from "./ui/text";
import { getCategoriesData, getQuickLinksData } from "@/constants/data";
import Link from "next/link";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getServerLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

const Footer = async () => {
  const locale = await getServerLocale();
  const quickLinksData = getQuickLinksData(locale);
  const categoriesData = getCategoriesData(locale);

  return (
    <footer className="bg-white border-t">
      <Container>
        <FooterTop locale={locale} />
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo />
            <SubText>
              {locale === "en"
                ? "Ecom by Yeison is your premium technology destination. Explore the latest gadgets, electronics, and accessories at great prices."
                : "Ecom by Yeison es tu destino de tecnología premium. Exploramos lo más nuevo en gadgets, electrónica y accesorios con los mejores precios del mercado."}
            </SubText>
            <SocialMedia
              className="text-darkColor/60"
              iconClassName="border-darkColor/60 hover:border-shop_light_green hover:text-shop_light_green"
              tooltipClassName="bg-darkColor text-white"
            />
          </div>
          <div>
            <SubTitle>{t(locale, "footerQuickLinks")}</SubTitle>
            <ul className="space-y-3 mt-4">
              {quickLinksData?.map((item) => (
                <li key={item?.title}>
                  <Link
                    href={item?.href}
                    className="hover:text-shop_light_green hoverEffect font-medium"
                  >
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SubTitle>{t(locale, "footerCategories")}</SubTitle>
            <ul className="space-y-3 mt-4">
              {categoriesData?.map((item) => (
                <li key={item?.title}>
                  <Link
                    href={`/category/${item?.href}`}
                    className="hover:text-shop_light_green hoverEffect font-medium"
                  >
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <SubTitle>{t(locale, "footerNewsletter")}</SubTitle>
            <SubText>
              {t(locale, "footerNewsletterDesc")}
            </SubText>
            <form className="space-y-3">
              <Input placeholder={t(locale, "footerEmailPlaceholder")} type="email" required />
              <Button className="w-full bg-shop_dark_green hover:bg-shop_dark_green/90 text-white">
                {t(locale, "footerSubscribe")}
              </Button>
            </form>
          </div>
        </div>
        <div className="py-6 border-t text-center text-sm text-gray-500">
          <div>
            © {new Date().getFullYear()} <strong>Ecom by Yeison</strong>. {t(locale, "footerCopyright")}
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
