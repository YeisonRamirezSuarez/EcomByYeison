"use client";

import { useState } from "react";
import { savePage } from "@/actions/brand";
import type { PageContent } from "@/lib/brand";
import type { Locale } from "@/lib/i18n";
import { lacksLanguage, localeKey, twinError, twinPatch, type StoreLanguages } from "@/lib/localize";
import { PAGE_KEYS, PAGE_LABELS, validatePage, type PageKey } from "@/lib/validation";
import { SectionCard, TextField, useSave } from "../brand/fields";
import EditorLocale from "../EditorLocale";
import BlockEditor from "./BlockEditor";

const PAGE_PATHS: Record<PageKey, string> = {
  about: "/about",
  terms: "/terms",
  privacy: "/privacy",
  faqs: "/faqs",
  help: "/help",
};

const PagesTab = ({ initialPages, languages }: { initialPages: Record<PageKey, PageContent>; languages: StoreLanguages }) => {
  const { primary } = languages;
  const other: Locale = primary === "es" ? "en" : "es";
  const [edit, setEdit] = useState<Locale>(primary);
  const introKey = localeKey("intro", edit) as "intro" | "introEn";
  const lang = { edit, primary, single: languages.languages.length < 2 };
  const [saved, setSaved] = useState(initialPages);
  const [key, setKey] = useState<PageKey>("about");
  const [draft, setDraft] = useState<PageContent>(initialPages.about);
  const [askDiscard, setAskDiscard] = useState<PageKey | null>(null);
  const { errors, pending, save, clearErrors } = useSave(
    (input) => validatePage(input, primary),
    (v) => savePage(key, v),
    (v) => {
      setSaved((prev) => ({ ...prev, [key]: v }));
      setDraft(v);
    }
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved[key]);

  const open = (next: PageKey) => {
    setKey(next);
    setDraft(saved[next]);
    setAskDiscard(null);
    clearErrors();
  };
  const choose = (next: PageKey) => {
    if (next === key) return;
    if (dirty) setAskDiscard(next);
    else open(next);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr] items-start">
      {/* Locked while saving: a late save must not land on another page's draft. */}
      <nav className="bg-white rounded-2xl shadow-sm p-2 flex md:flex-col gap-1 overflow-x-auto" aria-label="Páginas">
        {PAGE_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={pending}
            onClick={() => choose(k)}
            aria-current={k === key ? "page" : undefined}
            className={`text-left whitespace-nowrap px-3 py-2 rounded-lg text-sm disabled:opacity-60 ${
              k === key ? "bg-shop_dark_green text-white font-semibold" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            {PAGE_LABELS[k]}
          </button>
        ))}
      </nav>
      <div className="flex flex-col gap-4 bg-white rounded-2xl shadow-sm p-5">
        <a
          href={PAGE_PATHS[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="self-end text-sm font-medium text-shop_orange hover:underline"
        >
          Ver página
        </a>
      {askDiscard && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Tienes cambios sin guardar. ¿Descartarlos?
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => open(askDiscard)}
              disabled={pending}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-60"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={() => setAskDiscard(null)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold"
            >
              Seguir editando
            </button>
          </div>
        </div>
      )}
      {languages.languages.length > 1 && (
        <EditorLocale value={edit} onChange={setEdit} missing={lacksLanguage(validatePage(draft, other), other) ? [other] : []} />
      )}
      <SectionCard title={PAGE_LABELS[key]} pending={pending} onSave={() => save(draft)}>
        <TextField
          label="Introducción"
          multiline
          max={2000}
          value={draft[introKey]}
          onChange={(v) => setDraft((d) => ({ ...d, ...twinPatch("intro", v, edit, lang.single) }))}
          error={twinError(errors, "", "intro", edit, primary)}
        />
        <p className="text-xs text-gray-500 -mt-2">Separa los párrafos con una línea en blanco.</p>
        <BlockEditor blocks={draft.blocks} onChange={(blocks) => setDraft((d) => ({ ...d, blocks }))} errors={errors} lang={lang} />
      </SectionCard>
      </div>
    </div>
  );
};

export default PagesTab;
