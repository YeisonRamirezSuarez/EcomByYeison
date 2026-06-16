import type { Metadata } from "next";
import { headers } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientClerkProvider from "@/components/ClientClerkProvider";
import ThemePanel from "@/components/ThemePanel";

export const metadata: Metadata = {
  title: {
    template: "%s | Ecom by Yeison",
    default: "Ecom by Yeison — Tu tienda de tecnología",
  },
  description:
    "Ecom by Yeison — La mejor selección de tecnología, gadgets y electrónica con los mejores precios.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Forward the CSP nonce (set by proxy.ts) to Clerk so its injected
  // scripts/styles carry it and aren't blocked by the policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <ClientClerkProvider nonce={nonce}>
      <div className="flex flex-col min-h-screen overflow-x-hidden">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ThemePanel />
      </div>
    </ClientClerkProvider>
  );
}
