import { headers } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientClerkProvider from "@/components/ClientClerkProvider";
import InstallPrompt from "@/components/InstallPrompt";

export default async function ClientLayout({
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
        <InstallPrompt />
      </div>
    </ClientClerkProvider>
  );
}
