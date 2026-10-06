import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export async function generateMetadata(): Promise<Metadata> {
  const { storeName, tagline, description, favicon } = await getSiteSettings();
  return {
    title: {
      template: `%s | ${storeName}`,
      default: tagline ? `${storeName} — ${tagline}` : storeName,
    },
    description,
    icons: { icon: favicon?.url ?? "/favicon.ico" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={esES}
      appearance={{ layout: { unsafe_disableDevelopmentModeWarnings: true } }}
    >
      <div className="flex flex-col min-h-screen overflow-x-hidden">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </ClerkProvider>
  );
}
