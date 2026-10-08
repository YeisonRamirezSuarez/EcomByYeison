"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";
import type { ContentBlock } from "@/lib/brand";
import { localeKey, twinError, twinPatch } from "@/lib/localize";
import { CONTENT_ICONS, MAX_BLOCKS, type ContentIconKey } from "@/lib/validation";
import { CONTENT_ICON_COMPONENTS } from "@/components/contentIcons";
import { INPUT, TextField, type TwinLang } from "../brand/fields";

const ICON_BUTTON =
  "w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40";
const ICON_KEYS = Object.keys(CONTENT_ICONS) as ContentIconKey[];

const BlockEditor = ({
  blocks,
  onChange,
  errors,
  lang,
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  errors: Record<string, string>;
  lang: TwinLang;
}) => {
  const ui = useAdminLocale();
  const { edit, primary, single } = lang;
  const titleKey = localeKey("title", edit) as "title" | "titleEn";
  const textKey = localeKey("text", edit) as "text" | "textEn";
  const update = (i: number, patch: Partial<ContentBlock>) =>
    onChange(blocks.map((block, j) => (j === i ? { ...block, ...patch } : block)));
  const move = (i: number, to: number) => {
    const next = [...blocks];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {errors.blocks && <p className="text-xs text-red-600">{errors.blocks}</p>}
      {blocks.map((block, i) => {
        const Icon = CONTENT_ICON_COMPONENTS[block.icon];
        return (
          <div key={block._key} className="rounded-lg border border-gray-200 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                {Icon && <Icon size={14} />} {tr(ui, "Bloque {n}", { n: i + 1 })}
              </span>
              <div className="flex gap-1">
                <button type="button" aria-label={tr(ui, "Subir bloque")} disabled={i === 0} onClick={() => move(i, i - 1)} className={ICON_BUTTON}>
                  <ArrowUp size={14} />
                </button>
                <button type="button" aria-label={tr(ui, "Bajar bloque")} disabled={i === blocks.length - 1} onClick={() => move(i, i + 1)} className={ICON_BUTTON}>
                  <ArrowDown size={14} />
                </button>
                <button type="button" aria-label={tr(ui, "Eliminar bloque")} onClick={() => onChange(blocks.filter((_, j) => j !== i))} className={ICON_BUTTON}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">{tr(ui, "Ícono")}</span>
              <select
                value={block.icon}
                onChange={(e) => update(i, { icon: e.target.value as ContentIconKey })}
                className={`${INPUT} mt-1`}
              >
                {ICON_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {tr(ui, CONTENT_ICONS[key])}
                  </option>
                ))}
              </select>
              {errors[`blocks.${i}.icon`] && (
                <span className="block text-xs text-red-600 mt-1">{errors[`blocks.${i}.icon`]}</span>
              )}
            </label>
            <TextField label={tr(ui, "Título")} max={120} value={block[titleKey]} onChange={(v) => update(i, twinPatch("title", v, edit, single) as Partial<ContentBlock>)} error={twinError(errors, `blocks.${i}.`, "title", edit, primary)} />
            <TextField label={tr(ui, "Texto")} multiline max={1000} value={block[textKey]} onChange={(v) => update(i, twinPatch("text", v, edit, single) as Partial<ContentBlock>)} error={twinError(errors, `blocks.${i}.`, "text", edit, primary)} />
            <TextField label={tr(ui, "Enlace (opcional)")} placeholder="/faqs" max={300} value={block.href} onChange={(v) => update(i, { href: v })} error={errors[`blocks.${i}.href`]} />
          </div>
        );
      })}
      {blocks.length < MAX_BLOCKS && (
        <button
          type="button"
          onClick={() =>
            onChange([
              ...blocks,
              { _key: crypto.randomUUID(), icon: "help-circle", title: "", titleEn: "", text: "", textEn: "", href: "" },
            ])
          }
          className="self-start text-xs font-semibold text-shop_dark_green"
        >
          {tr(ui, "+ Agregar bloque")}
        </button>
      )}
    </div>
  );
};

export default BlockEditor;
