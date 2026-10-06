"use client";

import { useState } from "react";
import { savePage } from "@/actions/brand";
import type { PageContent } from "@/lib/brand";
import { PAGE_KEYS, PAGE_LABELS, validatePage, type PageKey } from "@/lib/validation";
import { INPUT, SectionCard, TextField, useSave } from "../brand/fields";
import BlockEditor from "./BlockEditor";

const PagesTab = ({ initialPages }: { initialPages: Record<PageKey, PageContent> }) => {
  const [saved, setSaved] = useState(initialPages);
  const [key, setKey] = useState<PageKey>("about");
  const [draft, setDraft] = useState<PageContent>(initialPages.about);
  const [askDiscard, setAskDiscard] = useState<PageKey | null>(null);
  const { errors, pending, save, clearErrors } = useSave(
    validatePage,
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
    <div className="flex flex-col gap-4">
      <label className="block">
        <span className="text-xs font-semibold text-gray-700">Página</span>
        <select value={key} onChange={(e) => choose(e.target.value as PageKey)} className={`${INPUT} mt-1`}>
          {PAGE_KEYS.map((k) => (
            <option key={k} value={k}>
              {PAGE_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      {askDiscard && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Tienes cambios sin guardar. ¿Descartarlos?
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => open(askDiscard)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold"
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
      <SectionCard title={PAGE_LABELS[key]} pending={pending} onSave={() => save(draft)}>
        <TextField
          label="Introducción"
          multiline
          max={2000}
          value={draft.intro}
          onChange={(v) => setDraft((d) => ({ ...d, intro: v }))}
          error={errors.intro}
        />
        <p className="text-xs text-gray-500 -mt-2">Separa los párrafos con una línea en blanco.</p>
        <BlockEditor blocks={draft.blocks} onChange={(blocks) => setDraft((d) => ({ ...d, blocks }))} errors={errors} />
      </SectionCard>
    </div>
  );
};

export default PagesTab;
