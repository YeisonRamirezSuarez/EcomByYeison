"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (public/sw.js) after the page loads.
 *
 * Only runs in production: registering a service worker in `next dev` can
 * interfere with HMR and would persist on localhost across other projects.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
