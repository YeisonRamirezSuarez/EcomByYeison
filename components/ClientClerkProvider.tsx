"use client";

import { ReactNode, useMemo } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { enUS } from "@clerk/localizations";
import { clerkEs } from "@/lib/clerkEs";
import useStore from "@/store";

const ClientClerkProvider = ({
  children,
  nonce,
}: {
  children: ReactNode;
  nonce?: string;
}) => {
  const { locale } = useStore();

  const localization = useMemo(() => {
    return locale === "en" ? enUS : clerkEs;
  }, [locale]);

  return (
    <ClerkProvider
      localization={localization}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      nonce={nonce}
      // Clerk 7 renamed appearance.layout to appearance.options.
      // "Secured by Clerk" hidden by the store owner's choice (Clerk removes it officially only on paid plans).
      appearance={{
        options: { unsafe_disableDevelopmentModeWarnings: true },
        elements: { userButtonPopoverFooter: { display: "none" }, footerItem: { display: "none" } },
      }}
    >
      {children}
    </ClerkProvider>
  );
};

export default ClientClerkProvider;
