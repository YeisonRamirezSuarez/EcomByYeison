import React from "react";
import Container from "./Container";
import FooterTop from "./FooterTop";
import Logo from "./Logo";
import SocialMedia from "./SocialMedia";
import { SubText, SubTitle } from "./ui/text";
import { categoriesData, quickLinksData } from "@/constants/data";
import Link from "next/link";
import NewsletterForm from "./NewsletterForm";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

const Footer = async () => {
  const { storeName, description } = await getSiteSettings();

  return (
    <footer className="bg-white border-t">
      <Container>
        <FooterTop />
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo />
            {description && <SubText>{description}</SubText>}
            <SocialMedia
              className="text-darkColor/60"
              iconClassName="border-darkColor/60 hover:border-shop_light_green hover:text-shop_light_green"
              tooltipClassName="bg-darkColor text-white"
            />
          </div>
          <div>
            <SubTitle>Enlaces rápidos</SubTitle>
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
            <SubTitle>Categorías</SubTitle>
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
            <SubTitle>Boletín</SubTitle>
            <SubText>
              Suscríbete y recibe ofertas exclusivas y las últimas novedades
            </SubText>
            <NewsletterForm storeName={storeName} />
          </div>
        </div>
        <div className="py-6 border-t text-center text-sm text-gray-500">
          <div>
            © {new Date().getFullYear()} <strong>{storeName}</strong>. Todos
            los derechos reservados.
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
