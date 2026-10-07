import { Suspense } from "react";
import { headers } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientClerkProvider from "@/components/ClientClerkProvider";
import InstallPrompt from "@/components/InstallPrompt";
import PreviewBridge from "@/components/PreviewBridge";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Forward the CSP nonce (set by proxy.ts) to Clerk so its injected
  // scripts/styles carry it and aren't blocked by the policy.
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const preview = requestHeaders.get("x-preview") === "1";
  const { styles } = await getSiteSettings();

  return (
    <ClientClerkProvider nonce={nonce}>
      <div className="flex flex-col min-h-screen overflow-x-hidden" data-store-root="" data-buttons={styles.buttons}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <InstallPrompt />
        {preview && (
          <Suspense fallback={null}>
            <PreviewBridge />
          </Suspense>
        )}
      </div>
    </ClientClerkProvider>
  );
}
