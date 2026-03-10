import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import ThemePanel from "@/components/ThemePanel";

export const metadata: Metadata = {
  title: {
    template: "%s | Ecom by Yeison",
    default: "Ecom by Yeison — Tu tienda de tecnología",
  },
  description:
    "Ecom by Yeison — La mejor selección de tecnología, gadgets y electrónica con los mejores precios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={esES} signInUrl="/sign-in" signUpUrl="/sign-up">
      <div className="flex flex-col min-h-screen overflow-x-hidden">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ThemePanel />
      </div>
    </ClerkProvider>
  );
}
