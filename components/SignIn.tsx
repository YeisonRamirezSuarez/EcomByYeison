"use client";

import { useState } from "react";
import { AuthModal } from "./AuthModal";
import { useLocale } from "@/components/StoreSettingsProvider";
import { t } from "@/lib/i18n";

const SignIn = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const locale = useLocale();

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-sm font-semibold hover:text-darkColor text-lightColor hover:cursor-pointer hoverEffect"
      >
        {t(locale, "authLogin")}
      </button>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default SignIn;
