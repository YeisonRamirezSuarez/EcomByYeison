import React from "react";
import Container from "./Container";
import Logo from "./Logo";
import HeaderMenu from "./HeaderMenu";
import SearchBar from "./SearchBar";
import CartIcon from "./CartIcon";
import FavoriteButton from "./FavoriteButton";
import SignIn from "./SignIn";
import MobileMenu from "./MobileMenu";
import LanguageToggle from "./LanguageToggle";
import { auth } from "@clerk/nextjs/server";
import { ClerkLoaded, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ClipboardList, Truck, ShieldCheck, HeadphonesIcon } from "lucide-react";
import OrderCountBadge from "./OrderCountBadge";
import { getServerLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import AdminLink from "./AdminLink";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { formatPrice } from "@/constants/currencies";

const Header = async () => {
  // auth() reads the session from the request (no network); the rest runs in parallel.
  const { userId } = await auth();
  const [locale, settings] = await Promise.all([getServerLocale(), getSiteSettings()]);
  const freeShippingFrom = formatPrice(settings.checkout.freeShippingFrom, settings.currency, 0);

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement Bar */}
      <div className="bg-shop_dark_green text-white text-xs py-2 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Truck size={12} />
              {t(locale, "headerFreeShipping", { amount: freeShippingFrom })}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} />
              {t(locale, "headerSecurePurchase")}
            </span>
            <span className="flex items-center gap-1.5">
              <HeadphonesIcon size={12} />
              {t(locale, "headerSupport")}
            </span>
          </div>
          <span className="font-semibold tracking-wide">
            {t(locale, "headerWelcome", { store: settings.storeName })}
          </span>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm pt-[env(safe-area-inset-top)] md:pt-0">
        <Container className="flex items-center justify-between py-4 text-lightColor">
          <div className="w-auto md:w-1/3 flex items-center gap-2.5 justify-start">
            <MobileMenu />
            <Logo />
          </div>
          <HeaderMenu />
          <div className="w-auto md:w-1/3 flex items-center justify-end gap-4">
            <SearchBar placeholder={t(locale, "searchPlaceholder")} />
            <div className="flex items-center gap-3">
              {settings.languages.length > 1 && <LanguageToggle />}
              <AdminLink />
              <CartIcon />
              <FavoriteButton />
              {userId && (
                <Link
                  href={"/orders"}
                  className="group relative hover:text-shop_light_green hoverEffect"
                  title={t(locale, "headerMyOrders")}
                >
                  <ClipboardList size={20} />
                  <OrderCountBadge />
                </Link>
              )}
              <ClerkLoaded>{userId ? <UserButton userProfileProps={{ apiKeysProps: { hide: true } }} /> : <SignIn />}</ClerkLoaded>
            </div>
          </div>
        </Container>
      </div>
    </header>
  );
};

export default Header;
