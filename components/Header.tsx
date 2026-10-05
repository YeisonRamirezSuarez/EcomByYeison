import React from "react";
import Container from "./Container";
import Logo from "./Logo";
import HeaderMenu from "./HeaderMenu";
import SearchBar from "./SearchBar";
import CartIcon from "./CartIcon";
import FavoriteButton from "./FavoriteButton";
import SignIn from "./SignIn";
import MobileMenu from "./MobileMenu";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ClerkLoaded, SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ClipboardList, Truck, ShieldCheck, HeadphonesIcon } from "lucide-react";
import { getMyOrders } from "@/sanity/queries";
import AdminButton from "./admin/AdminButton";
import { adminTabs, roleFromMetadata } from "@/lib/permissions";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { CURRENCIES, formatPrice } from "@/constants/currencies";

const Header = async () => {
  const user = await currentUser();
  const { userId } = await auth();
  let orders = null;
  if (userId) {
    orders = await getMyOrders(userId);
  }
  const tabs = user ? adminTabs(roleFromMetadata(user.publicMetadata)) : [];
  const settings = await getSiteSettings();
  const freeShippingFrom = formatPrice(
    CURRENCIES[settings.currency].freeShippingFrom,
    settings.currency,
    0
  );

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement Bar */}
      <div className="bg-shop_dark_green text-white text-xs py-2 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Truck size={12} />
              Envío gratis en pedidos superiores a {freeShippingFrom}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} />
              Compra 100% segura
            </span>
            <span className="flex items-center gap-1.5">
              <HeadphonesIcon size={12} />
              Soporte 24/7
            </span>
          </div>
          <span className="font-semibold tracking-wide">Bienvenido a Ecom by Yeison</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <Container className="flex items-center justify-between py-4 text-lightColor">
          <div className="w-auto md:w-1/3 flex items-center gap-2.5 justify-start">
            <MobileMenu />
            <Logo />
          </div>
          <HeaderMenu />
          <div className="w-auto md:w-1/3 flex items-center justify-end gap-4">
            <SearchBar />
            <div className="flex items-center gap-3">
              <CartIcon />
              <FavoriteButton />
              {user && (
                <Link
                  href={"/orders"}
                  className="group relative hover:text-shop_light_green hoverEffect"
                  title="Mis pedidos"
                >
                  <ClipboardList size={20} />
                  <span className="absolute -top-1.5 -right-1.5 bg-shop_btn_dark_green text-white h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center shadow">
                    {orders?.length ?? 0}
                  </span>
                </Link>
              )}
              <ClerkLoaded>
                <SignedIn>
                  <UserButton />
                </SignedIn>
                {!user && <SignIn />}
              </ClerkLoaded>
            </div>
          </div>
        </Container>
      </div>
      {tabs.length > 0 && (
        <AdminButton tabs={tabs} theme={settings.theme} currency={settings.currency} />
      )}
    </header>
  );
};

export default Header;
