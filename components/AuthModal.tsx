"use client";

import { useEffect, useState } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const { isSignedIn } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [authView, setAuthView] = useState<"signIn" | "signUp">("signIn");
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar modal cuando se complete la autenticación
  useEffect(() => {
    if (!isOpen || !isSignedIn || !mounted) return;
    setShowSuccess(true);

    const timer = setTimeout(() => {
      onClose();
      // Refresh server components (Header/currentUser) without full page reload.
      router.refresh();
    }, 3200);

    return () => clearTimeout(timer);
  }, [isOpen, isSignedIn, onClose, mounted, router]);

  useEffect(() => {
    if (!isOpen) {
      setShowSuccess(false);
      setAuthView("signIn");
    }
  }, [isOpen]);

  // Prevenir scroll cuando el modal está abierto
  useEffect(() => {
    if (isOpen && mounted) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, mounted]);

  if (!isOpen || !mounted) return null;

  const clerkAppearance = {
    layout: "socialButtonsBlockButton",
    elements: {
      rootBox: "w-full max-w-full",
      card: "border-0 shadow-none bg-transparent",
      formContainer: "w-full max-w-full",
      socialButtonsBlockButton: "w-full h-12 text-base font-medium",
      socialButtonsBlockButton__google:
        "bg-white border-2 border-gray-300 hover:border-shop_dark_green hover:bg-gray-50 text-gray-900",
      formButtonPrimary:
        "w-full h-12 text-base font-medium bg-shop_dark_green hover:bg-shop_dark_green/90 text-white",
      dividerLine: "bg-gray-200",
      dividerText: "text-gray-500 text-sm",
      formFieldInput:
        "border-gray-300 focus:border-shop_dark_green focus:ring-shop_dark_green/20",
      formFieldLabel: "text-gray-700 font-medium",
      headerTitle: "hidden",
      headerSubtitle: "hidden",
      footer: "hidden",
      footerAction: "hidden",
      footerActionText: "hidden",
      identityPreviewText: "text-sm text-lightColor",
      formResendCodeLink: "text-shop_dark_green hover:text-shop_light_green font-medium",
      formResendCodeLinkTimer: "text-lightColor",
      formFieldAction: "text-shop_dark_green hover:text-shop_light_green",
    },
  } as const;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[min(96vw,30rem)] max-h-[92dvh] overflow-x-hidden overflow-y-auto scrollbar-hide overscroll-contain animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition z-10"
          aria-label="Cerrar"
        >
          <X size={24} className="text-gray-600" />
        </button>

        {/* Content */}
        <div className="p-5 pt-12 sm:p-8 sm:pt-12">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {authView === "signIn" ? "Inicia sesion" : "Registrate"}
            </h2>
            <p className="text-gray-600 text-sm">
              {authView === "signIn"
                ? "Accede a tu cuenta de Ecom by Yeison"
                : "Crea tu cuenta en Ecom by Yeison"}
            </p>
          </div>

          {showSuccess ? (
            <div className="relative overflow-hidden rounded-2xl border border-shop_light_green/35 bg-gradient-to-br from-shop_light_bg via-white to-shop_light_bg p-6 text-center animate-in fade-in zoom-in-95 duration-700">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-shop_dark_green via-shop_light_green to-shop_orange animate-[brandGlow_1.6s_ease-in-out_infinite]" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-40 animate-[sweep_1.8s_ease-in-out_infinite]" />
              <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-shop_light_green/15 ring-2 ring-shop_light_green/25 animate-[successPop_650ms_cubic-bezier(.22,1,.36,1)]">
                <CheckCircle2 className="text-shop_dark_green" size={32} />
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-shop_dark_green">Inicio exitoso</h3>
              <p className="mt-1 text-sm text-lightColor">
                Bienvenido de nuevo. Estamos actualizando tu sesion...
              </p>
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-shop_light_green/20">
                <div className="h-full w-full origin-left rounded-full bg-gradient-to-r from-shop_dark_green via-shop_light_green to-shop_orange animate-[shrink_3s_linear_forwards]" />
              </div>
            </div>
          ) : (
            <div className="w-full auth-modal-clerk">
              {authView === "signIn" ? (
                <SignIn
                  routing="hash"
                  oauthFlow="popup"
                  withSignUp
                  transferable={true}
                  signUpUrl="/sign-up"
                  forceRedirectUrl="/"
                  fallbackRedirectUrl="/"
                  signUpForceRedirectUrl="/"
                  signUpFallbackRedirectUrl="/"
                  appearance={clerkAppearance}
                />
              ) : (
                <SignUp
                  routing="hash"
                  oauthFlow="popup"
                  signInUrl="/sign-in"
                  forceRedirectUrl="/"
                  fallbackRedirectUrl="/"
                  signInForceRedirectUrl="/"
                  signInFallbackRedirectUrl="/"
                  appearance={clerkAppearance}
                />
              )}

              <div className="mt-4 text-center text-sm text-lightColor">
                {authView === "signIn" ? (
                  <>
                    No tienes cuenta?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthView("signUp")}
                      className="font-semibold text-shop_dark_green hover:text-shop_light_green hoverEffect"
                    >
                      Registrate
                    </button>
                  </>
                ) : (
                  <>
                    Ya tienes cuenta?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthView("signIn")}
                      className="font-semibold text-shop_dark_green hover:text-shop_light_green hoverEffect"
                    >
                      Inicia sesion
                    </button>
                  </>
                )}
              </div>

              <style jsx global>{`
                .auth-modal-clerk .cl-footerAction,
                .auth-modal-clerk .cl-footerActionText,
                .auth-modal-clerk .cl-footerActionLink {
                  display: none !important;
                }
              `}</style>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
