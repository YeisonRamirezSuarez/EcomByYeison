"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { themeCssVars } from "@/constants/themes";
import { styleCssVars } from "@/lib/styles";
import { parseEditorMessage, type PreviewMessage } from "@/lib/previewMessages";

const PARAM = "vista-previa";
const HOVER = "1px dashed #9ca3af";
const SELECTED = "2px solid #f97316";

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

  useEffect(() => {
    const framed = window.parent !== window;
    let selected: string | null = null;
    let hovered: HTMLElement | null = null;

    const sectionAt = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>("[data-section-key]") : null;
    // Element.style (CSSOM) is not blocked by the CSP, unlike inline style attributes.
    const paint = () => {
      for (const el of document.querySelectorAll<HTMLElement>("[data-section-key]")) {
        el.style.outline = el.dataset.sectionKey === selected ? SELECTED : el === hovered ? HOVER : "";
        el.style.outlineOffset = "4px";
      }
    };
    const toEditor = (message: PreviewMessage) => window.parent.postMessage(message, window.location.origin);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = parseEditorMessage(event.data);
      if (!message) return;
      if (message.type === "preview-styles") {
        // Styles apply at once, before the saved draft refreshes the page.
        for (const [name, value] of Object.entries(styleCssVars(themeCssVars(message.theme), message.styles))) {
          document.documentElement.style.setProperty(name, value);
        }
        document.querySelector<HTMLElement>("[data-store-root]")?.setAttribute("data-buttons", message.styles.buttons);
      } else if (message.type === "preview-refresh") {
        router.refresh();
      } else {
        selected = message.key;
        document.querySelector(`[data-section-key="${CSS.escape(message.key)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        paint();
      }
    };

    // On the home page inside the editor, a click picks the section instead of following links or buttons.
    const onClick = (event: MouseEvent) => {
      const section = sectionAt(event.target);
      if (!section || window.location.pathname !== "/") return;
      event.preventDefault();
      event.stopPropagation();
      selected = section.dataset.sectionKey ?? null;
      paint();
      if (selected) toEditor({ type: "select-section", key: selected });
    };
    const onOver = (event: MouseEvent) => {
      const next = sectionAt(event.target);
      if (next === hovered) return;
      hovered = next;
      paint();
    };
    // router.refresh() can replace section nodes: repaint the outlines.
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    });

    window.addEventListener("message", onMessage);
    if (framed) {
      window.addEventListener("click", onClick, true);
      document.addEventListener("mouseover", onOver);
      observer.observe(document.body, { childList: true, subtree: true });
    }
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("click", onClick, true);
      document.removeEventListener("mouseover", onOver);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [router]);

  return null;
};

export default PreviewBridge;
