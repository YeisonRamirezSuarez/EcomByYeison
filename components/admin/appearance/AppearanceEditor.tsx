"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { discardAppearance, publishAppearance, saveAppearanceDraft } from "@/actions/appearance";
import type { ThemeKey } from "@/constants/themes";
import { validateStyles, type Styles } from "@/lib/styles";
import type { EditorMessage } from "@/lib/previewMessages";
import type { SiteSettings } from "@/sanity/queries/siteSettings";
import IdentitySection from "../brand/IdentitySection";
import BannerSection from "../brand/BannerSection";
import ContactSection from "../brand/ContactSection";
import SocialSection from "../brand/SocialSection";
import { draftSaves, useAutosave } from "../brand/fields";
import StylesPanel from "./StylesPanel";
import PreviewFrame, { type Device } from "./PreviewFrame";
import {
  DEFAULT_HOME_SECTIONS,
  isSectionComplete,
  newSection,
  validateHomeSections,
  withBuiltIns,
  type HomeSection,
  type NewKind,
} from "@/lib/homeSections";
import { parsePreviewMessage } from "@/lib/previewMessages";
import type { Option } from "@/sanity/queries/adminCatalog";
import SectionList from "./SectionList";
import SectionForm from "./SectionForm";

type Tab = "inicio" | "estilos" | "datos";
const TABS: { key: Tab; label: string }[] = [
  { key: "inicio", label: "Inicio" },
  { key: "estilos", label: "Estilos" },
  { key: "datos", label: "Datos de la tienda" },
];
const DEVICES: { key: Device; label: string }[] = [
  { key: "pc", label: "PC" },
  { key: "movil", label: "Móvil" },
];

const AppearanceEditor = ({ initial, initialHasDraft, categories }: { initial: SiteSettings; initialHasDraft: boolean; categories: Option[] }) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [tab, setTab] = useState<Tab>("inicio");
  const [device, setDevice] = useState<Device>("pc");
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [saveFailed, setSaveFailed] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  const [busy, startTransition] = useTransition();
  const [theme, setTheme] = useState<ThemeKey>(initial.theme);
  const [styles, setStyles] = useState<Styles>(initial.styles);
  const [sections, setSections] = useState<HomeSection[]>(() => withBuiltIns(initial.homeSections ?? DEFAULT_HOME_SECTIONS));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const post = (message: EditorMessage) => frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  const events = {
    onSaved: () => {
      setHasDraft(true);
      setSaveFailed(false);
      post({ type: "preview-refresh" });
    },
    onError: () => setSaveFailed(true),
  };

  const stylesSave = useAutosave(styles, validateStyles, (v) => saveAppearanceDraft("styles", v), events);
  const sectionsSave = useAutosave(sections, validateHomeSections, (v) => saveAppearanceDraft("homeSections", v), events);

  const categoryGone = (s: HomeSection) =>
    s.kind === "products" && s.source === "category" && Boolean(s.category) && !categories.some((c) => c._id === s.category);
  const isShown = (s: HomeSection) => isSectionComplete(s) && !categoryGone(s);
  const selectedIndex = sections.findIndex((s) => s._key === selectedKey);
  const selected = selectedIndex >= 0 ? sections[selectedIndex] : null;
  const prefix = `sections.${selectedIndex}.`;
  const selectedErrors = Object.fromEntries(
    Object.entries(sectionsSave.errors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, message]) => [key.slice(prefix.length), message])
  );

  const open = (key: string) => {
    setTab("inicio");
    setSelectedKey(key);
    post({ type: "focus-section", key });
  };
  const updateSection = (next: HomeSection) => setSections((list) => list.map((s) => (s._key === next._key ? next : s)));
  const addSection = (kind: NewKind) => {
    const section = newSection(kind, crypto.randomUUID());
    setSections((list) => [...list, section]);
    setSelectedKey(section._key);
  };
  const removeSection = (key: string) => {
    setSections((list) => list.filter((s) => s._key !== key));
    setSelectedKey(null);
  };

  // A click on a section inside the preview opens it here.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const message = parsePreviewMessage(event.data);
      if (!message) return;
      setTab("inicio");
      setSelectedKey(message.key);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Styles show in the preview at once; the draft save follows 1 s after the last change.
  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage({ type: "preview-styles", theme, styles } satisfies EditorMessage, window.location.origin);
  }, [theme, styles]);

  const changeTheme = async (key: ThemeKey) => {
    setTheme(key);
    setStyles((s) => ({ ...s, colors: {} })); // a palette starts without own colors
    const result = await draftSaves.run(() => saveAppearanceDraft("theme", key));
    if (result.ok) events.onSaved();
    else events.onError();
  };

  const publish = () =>
    startTransition(async () => {
      // Send edits still waiting for their 1 s pause, so the last keystroke gets published too.
      await draftSaves.flush();
      const result = await publishAppearance();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setHasDraft(false);
      toast.success("Cambios publicados en la tienda");
      post({ type: "preview-refresh" });
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
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-4rem)]">
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl shadow-sm px-4 py-2.5">
        <h1 className="text-lg font-bold text-shop_dark_green mr-2">Apariencia</h1>
        <div role="tablist" aria-label="Partes del editor" className="flex gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold ${tab === key ? "bg-shop_dark_green text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex rounded-full bg-gray-100 p-0.5" role="group" aria-label="Dispositivo">
          {DEVICES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={device === key}
              onClick={() => setDevice(key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${device === key ? "bg-white shadow-sm text-shop_dark_green" : "text-gray-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {stylesSave.pending || sectionsSave.pending ? (
          <span className="text-xs text-gray-500">Guardando…</span>
        ) : (
          hasDraft && <span className="text-xs font-semibold rounded-full bg-amber-100 text-amber-800 px-2.5 py-1">Cambios sin publicar</span>
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
      </div>

      {saveFailed && (
        <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          No se pudo guardar el borrador. Se intentará de nuevo con tu próximo cambio.
        </p>
      )}
      {askDiscard && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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

      <div className="flex-1 min-h-0 grid gap-3 lg:grid-cols-[360px_1fr]">
        {/* Every tab stays mounted (hidden) so its forms keep their unsaved state. */}
        <div className="bg-white rounded-2xl shadow-sm p-4 overflow-y-auto">
          <div role="tabpanel" className={tab === "inicio" ? "flex flex-col gap-3" : "hidden"}>
            {selected ? (
              <SectionForm
                key={selected._key}
                section={selected}
                shown={isShown(selected)}
                categoryGone={categoryGone(selected)}
                errors={selectedErrors}
                categories={categories}
                onChange={updateSection}
                onBack={() => setSelectedKey(null)}
                onRemove={() => removeSection(selected._key)}
              />
            ) : (
              <SectionList
                sections={sections}
                error={
                  sectionsSave.errors.sections ??
                  (Object.keys(sectionsSave.errors).length > 0
                    ? "Hay campos por corregir en una sección. Los cambios del inicio no se guardan hasta corregirlos."
                    : undefined)
                }
                isShown={isShown}
                onChange={setSections}
                onOpen={open}
                onAdd={addSection}
              />
            )}
            {/* Kept mounted so the banner form keeps its state when going back to the list. */}
            <div className={selected?.kind === "banner" ? "" : "hidden"}>
              <BannerSection initial={initial.banner} {...events} />
            </div>
          </div>
          <div role="tabpanel" className={tab === "estilos" ? "" : "hidden"}>
            <StylesPanel theme={theme} styles={styles} errors={stylesSave.errors} onThemeChange={changeTheme} onChange={setStyles} />
          </div>
          <div role="tabpanel" className={tab === "datos" ? "flex flex-col gap-6" : "hidden"}>
            <section className="flex flex-col gap-3">
              <h2 className="font-bold text-gray-900">Logo y nombre</h2>
              <IdentitySection initial={{ storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon }} {...events} />
            </section>
            <section className="flex flex-col gap-3">
              <h2 className="font-bold text-gray-900">Contacto</h2>
              <ContactSection initial={initial.contact} {...events} />
            </section>
            <section className="flex flex-col gap-3">
              <h2 className="font-bold text-gray-900">Redes sociales</h2>
              <SocialSection initial={initial.social} {...events} />
            </section>
          </div>
        </div>
        <PreviewFrame frameRef={frameRef} device={device} onLoad={() => post({ type: "preview-styles", theme, styles })} />
      </div>
    </div>
  );
};

export default AppearanceEditor;
