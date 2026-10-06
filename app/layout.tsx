import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Poppins } from "next/font/google";
import { themeCssVars } from "@/constants/themes";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import StoreSettingsProvider from "@/components/StoreSettingsProvider";
import { toClientBrand } from "@/lib/brand";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const settings = await getSiteSettings();
  return (
    <html
      lang="es"
      className={poppins.variable}
      style={themeCssVars(settings.theme) as React.CSSProperties}
    >
      <body className="font-poppins antialiased overflow-x-hidden">
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
