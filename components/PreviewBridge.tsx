"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isThemeKey, themeCssVars } from "@/constants/themes";

const PARAM = "vista-previa";

// Rendered only in preview mode (the store inside the appearance editor's iframe).
const PreviewBridge = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Links inside the preview drop the param: put it back so the draft stays visible.
  useEffect(() => {
    if (params.get(PARAM) === "1") return;
    const next = new URLSearchParams(params);
    next.set(PARAM, "1");
    router.replace(`${pathname}?${next}`);
  }, [pathname, params, router]);

  // Palette clicks in the editor apply instantly, before the saved draft reloads the page.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; theme?: unknown } | null;
      if (data?.type !== "preview-theme" || !isThemeKey(data.theme)) return;
      for (const [name, value] of Object.entries(themeCssVars(data.theme))) {
        document.documentElement.style.setProperty(name, value);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
};

export default PreviewBridge;
