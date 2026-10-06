"use client";

import { useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ChevronDown } from "lucide-react";
import { discardAppearance, publishAppearance, saveAppearanceDraft } from "@/actions/appearance";
import type { ThemeKey } from "@/constants/themes";
import type { SiteSettings } from "@/sanity/queries/siteSettings";
import PageHeader from "../shell/PageHeader";
import IdentitySection from "../brand/IdentitySection";
import BannerSection from "../brand/BannerSection";
import ContactSection from "../brand/ContactSection";
import SocialSection from "../brand/SocialSection";
import ThemePicker from "./ThemePicker";
import PreviewFrame, { type Device } from "./PreviewFrame";

type Group = "paleta" | "identidad" | "banner" | "contacto" | "redes";
const GROUPS: { key: Group; label: string }[] = [
  { key: "paleta", label: "Paleta" },
  { key: "identidad", label: "Logo y nombre" },
  { key: "banner", label: "Banner" },
  { key: "contacto", label: "Contacto" },
  { key: "redes", label: "Redes sociales" },
];

const AppearanceEditor = ({ initial, initialHasDraft }: { initial: SiteSettings; initialHasDraft: boolean }) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [saveFailed, setSaveFailed] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>(initial.theme);
  const [open, setOpen] = useState<Group>("paleta");
  const [device, setDevice] = useState<Device>("pc");
  const [askDiscard, setAskDiscard] = useState(false);
  const [busy, startTransition] = useTransition();

  const reloadPreview = () => frameRef.current?.contentWindow?.location.reload();
  const events = {
    onSaved: () => {
      setHasDraft(true);
      setSaveFailed(false);
      reloadPreview();
    },
    onError: () => setSaveFailed(true),
  };

  const changeTheme = async (key: ThemeKey) => {
    setTheme(key);
    frameRef.current?.contentWindow?.postMessage({ type: "preview-theme", theme: key }, window.location.origin);
    const result = await saveAppearanceDraft("theme", key);
    if (result.ok) events.onSaved();
    else events.onError();
  };

  const publish = () =>
    startTransition(async () => {
      const result = await publishAppearance();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setHasDraft(false);
      toast.success("Cambios publicados en la tienda");
      reloadPreview();
    });

  const discard = () =>
    startTransition(async () => {
      const result = await discardAppearance();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Form fields hold the draft values: reload to start again from the published ones.
      window.location.reload();
    });

  const { storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon } = initial;

  return (
    <>
      <PageHeader title="Apariencia" description="Los cambios se guardan como borrador y solo los ves tú hasta publicarlos.">
        {hasDraft && (
          <span className="text-xs font-semibold rounded-full bg-amber-100 text-amber-800 px-2.5 py-1">Cambios sin publicar</span>
        )}
        <button
          type="button"
          disabled={!hasDraft || busy}
          onClick={() => setAskDiscard(true)}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-50"
        >
          Descartar
        </button>
        <button
          type="button"
          disabled={!hasDraft || busy}
          onClick={publish}
          className="px-4 py-2 rounded-lg bg-shop_orange text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Publicando…" : "Publicar"}
        </button>
      </PageHeader>

      {saveFailed && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          No se pudo guardar el borrador. Se intentará de nuevo con tu próximo cambio.
        </p>
      )}
      {askDiscard && (
        <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          ¿Descartar los cambios sin publicar?
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={discard} disabled={busy} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-60">
              Descartar
            </button>
            <button type="button" onClick={() => setAskDiscard(false)} className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold">
              Seguir editando
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
        <div className="flex flex-col gap-2 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto lg:pr-1">
          {GROUPS.map(({ key, label }) => (
            <section key={key} className="bg-white rounded-2xl shadow-sm">
              <button
                type="button"
                onClick={() => setOpen(key)}
                aria-expanded={open === key}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-shop_dark_green"
              >
                {label}
                <ChevronDown size={16} className={`transition-transform ${open === key ? "rotate-180" : ""}`} />
              </button>
              {/* Kept mounted (hidden) so each section keeps its unsaved state when collapsed. */}
              <div className={open === key ? "px-4 pb-4" : "hidden"}>
                {key === "paleta" && <ThemePicker value={theme} onChange={changeTheme} />}
                {key === "identidad" && (
                  <IdentitySection
                    initial={{ storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon }}
                    {...events}
                  />
                )}
                {key === "banner" && <BannerSection initial={initial.banner} {...events} />}
                {key === "contacto" && <ContactSection initial={initial.contact} {...events} />}
                {key === "redes" && <SocialSection initial={initial.social} {...events} />}
              </div>
            </section>
          ))}
        </div>
        <div className="lg:sticky lg:top-8 lg:h-[calc(100dvh-10rem)]">
          <PreviewFrame frameRef={frameRef} device={device} onDeviceChange={setDevice} />
        </div>
      </div>
    </>
  );
};

export default AppearanceEditor;
