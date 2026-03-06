import React from "react";
import Container from "./Container";
import FooterTop from "./FooterTop";
import Logo from "./Logo";
import SocialMedia from "./SocialMedia";
import { SubText, SubTitle } from "./ui/text";
import { categoriesData, quickLinksData } from "@/constants/data";
import Link from "next/link";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const Footer = () => {
  return (
    <footer className="bg-white border-t">
      <Container>
        <FooterTop />
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo />
            <SubText>
              Ecom by Yeison es tu destino de tecnología premium. Exploramos lo
              más nuevo en gadgets, electrónica y accesorios con los mejores
              precios del mercado.
            </SubText>
            <SocialMedia
              className="text-darkColor/60"
              iconClassName="border-darkColor/60 hover:border-shop_light_green hover:text-shop_light_green"
              tooltipClassName="bg-darkColor text-white"
            />
          </div>
          <div>
            <SubTitle>Quick Links</SubTitle>
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
            <SubTitle>Categories</SubTitle>
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
            <SubTitle>Newsletter</SubTitle>
            <SubText>
              Suscríbete y recibe ofertas exclusivas y las últimas novedades
            </SubText>
            <form className="space-y-3">
              <Input placeholder="Tu correo electrónico" type="email" required />
              <Button className="w-full bg-shop_dark_green hover:bg-shop_dark_green/90 text-white">Suscribirme</Button>
            </form>
          </div>
        </div>
        <div className="py-6 border-t text-center text-sm text-gray-500">
          <div>
            © {new Date().getFullYear()} <strong>Ecom by Yeison</strong>. Todos
            los derechos reservados.
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
