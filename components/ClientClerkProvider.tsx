"use client";

import { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { enUS } from "@clerk/localizations";
import { clerkEs } from "@/lib/clerkEs";
import type { Locale } from "@/lib/i18n";

// locale: the visitor's language resolved on the server. The admin layout passes the panel language.
const ClientClerkProvider = ({
  children,
  nonce,
  locale = "es",
}: {
  children: ReactNode;
  nonce?: string;
  locale?: Locale;
}) => (
  <ClerkProvider
    localization={locale === "en" ? enUS : clerkEs}
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

export default ClientClerkProvider;
