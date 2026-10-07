import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import LocaleSync from "@/components/LocaleSync";
import StoreSettingsProvider from "@/components/StoreSettingsProvider";
import { getServerLocale } from "@/lib/locale";
import { splashScreens } from "@/lib/splashScreens";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { THEMES, themeCssVars } from "@/constants/themes";
import { toClientBrand } from "@/lib/brand";
import { fontVariables } from "./fonts";
import { styleCssVars } from "@/lib/styles";

export async function generateMetadata(): Promise<Metadata> {
  const { storeName, tagline, description, favicon } = await getSiteSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
    title: {
      default: tagline ? `${storeName} — ${tagline}` : storeName,
      template: `%s | ${storeName}`,
    },
    description,
    applicationName: storeName,
    appleWebApp: { capable: true, statusBarStyle: "default", title: storeName },
    // Next 16 only emits the standard `mobile-web-app-capable`; iOS still reads the
    // legacy apple tag to launch full-screen standalone, so emit it explicitly.
    other: { "apple-mobile-web-app-capable": "yes" },
    formatDetection: { telephone: false },
    icons: {
      icon: favicon
        ? [{ url: favicon.url }]
        : [{ url: "/favicon.png", type: "image/png", sizes: "96x96" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { theme, styles } = await getSiteSettings();
  return {
    themeColor: styles.colors.primary ?? THEMES[theme].primary,
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    viewportFit: "cover",
  };
}

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const locale = await getServerLocale();
  const settings = await getSiteSettings();

  return (
    <html
      lang={locale}
      className={fontVariables}
      style={styleCssVars(themeCssVars(settings.theme), settings.styles) as React.CSSProperties}
    >
      <head>
        {/* iOS launch images — not supported by Next's Metadata API, so the
            apple-touch-startup-image links are emitted manually. */}
        {splashScreens.map((s) => (
          <link key={s.href} rel="apple-touch-startup-image" media={s.media} href={s.href} />
        ))}
      </head>
      <body className="antialiased overflow-x-hidden">
        <LocaleSync locale={locale} />
        <ServiceWorkerRegister />
        <StoreSettingsProvider currency={settings.currency} brand={toClientBrand(settings)}>
          {children}
        </StoreSettingsProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111827",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "14px",
              padding: "12px 16px",
            },
          }}
        />
      </body>
    </html>
  );
};
export default RootLayout;
