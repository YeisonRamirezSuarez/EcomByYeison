"use client";

import { ReactNode, useMemo } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { enUS, esES } from "@clerk/localizations";
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
    return locale === "en" ? enUS : esES;
  }, [locale]);

  return (
    <ClerkProvider
      localization={localization}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      nonce={nonce}
    >
      {children}
    </ClerkProvider>
  );
};

export default ClientClerkProvider;
