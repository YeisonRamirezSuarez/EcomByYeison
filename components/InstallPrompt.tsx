"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import useStore from "@/store";
import { t } from "@/lib/i18n";

/** Chrome/Android fire this; it isn't in the TS DOM lib yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 7;

/**
 * Add-to-home-screen prompt for mobile.
 *
 * - Android/Chrome: captures `beforeinstallprompt` and shows an "Install" button
 *   that triggers the native prompt.
 * - iOS Safari: never fires that event, so we show a short instruction to use
 *   Share -> Add to Home Screen instead.
 *
 * Hidden when the app already runs standalone (installed) or the user dismissed
 * it within the last week.
 */
const InstallPrompt = () => {
  const { locale } = useStore();
  const [mounted, setMounted] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Already installed → nothing to prompt.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari exposes this non-standard flag.
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    // Respect a recent dismissal.
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400000) {
      return;
    }

    // Phones/tablets only — never on desktop web, even though desktop Chrome
    // also fires `beforeinstallprompt`. A coarse primary pointer means touch.
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouchDevice) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios|chrome/.test(ua);
    if (iosDevice && isSafari) {
      setIsIos(true);
      setVisible(true);
    }

    const onBeforeInstall = (e: Event) => {
      // Stop Chrome's mini-infobar so we can show our own UI.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  const banner = (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:left-auto sm:right-4 sm:bottom-4 sm:w-96 sm:px-0">
      <div className="relative flex items-start gap-3 rounded-2xl border border-shop_light_green/30 bg-white p-4 shadow-2xl">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-shop_dark_green text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-darkColor">
            {t(locale, "installTitle")}
          </p>
          <p className="mt-0.5 text-xs text-lightColor">
            {isIos ? t(locale, "installIosHint") : t(locale, "installBody")}
          </p>
          {!isIos && (
            <button
              type="button"
              onClick={install}
              className="mt-2.5 inline-flex h-9 items-center rounded-full bg-shop_dark_green px-4 text-sm font-medium text-white hover:bg-shop_dark_green/90 hoverEffect"
            >
              {t(locale, "installButton")}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t(locale, "installDismiss")}
          className="shrink-0 rounded-full p-1 text-gray-500 hover:bg-gray-100 hoverEffect"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return createPortal(banner, document.body);
};

export default InstallPrompt;
