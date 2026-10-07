"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { saveAppearanceDraft } from "@/actions/appearance";
import type { BannerSettings, LocalizedCta } from "@/lib/brand";
import type { Locale } from "@/lib/i18n";
import { localeKey } from "@/lib/localize";
import { MAX_STATS, validateBanner } from "@/lib/validation";
import { TextField, twin, useAutosave, SavingNote, type AutosaveEvents } from "./fields";
import ImageField from "./ImageField";

const CTA_LABELS = { primaryCta: "Botón principal", secondaryCta: "Botón secundario" } as const;

const BannerSection = ({ initial, edit, primary, ...events }: { initial: BannerSettings; edit: Locale; primary: Locale } & AutosaveEvents) => {
  const [value, setValue] = useState(initial);
  const { errors, pending } = useAutosave(value, (input) => validateBanner(input, primary), (v) => saveAppearanceDraft("banner", v), events);
  const set = <K extends keyof BannerSettings>(key: K, v: BannerSettings[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));
  const setText = (field: string, v: string) => setValue((prev) => ({ ...prev, [field]: v }));
  const labelKey = localeKey("label", edit) as "label" | "labelEn";
  const setCta = (key: keyof typeof CTA_LABELS, field: keyof LocalizedCta, v: string) =>
    setValue((prev) => ({ ...prev, [key]: { ...prev[key], [field]: v } }));
  const setStat = (i: number, field: "value" | "label" | "labelEn", v: string) =>
    setValue((prev) => ({
      ...prev,
      stats: prev.stats.map((stat, j) => (j === i ? { ...stat, [field]: v } : stat)),
    }));

  return (
    <div className="flex flex-col gap-3">
      <TextField label="Etiqueta" {...twin(value, "badge", edit, setText, errors)} max={40} />
      <TextField label="Título" {...twin(value, "title", edit, setText, errors)} max={60} />
      <TextField label="Parte resaltada del título" {...twin(value, "highlight", edit, setText, errors)} max={30} />
      <TextField label="Subtítulo" {...twin(value, "subtitle", edit, setText, errors)} max={80} />
      <TextField label="Descripción" multiline {...twin(value, "description", edit, setText, errors)} max={200} />
      {(Object.keys(CTA_LABELS) as (keyof typeof CTA_LABELS)[]).map((key) => (
        <div key={key} className="grid grid-cols-2 gap-2">
          <TextField label={`${CTA_LABELS[key]}: texto`} value={value[key][labelKey]} onChange={(v) => setCta(key, labelKey, v)} error={errors[`${key}.${labelKey}`]} max={30} />
          <TextField label="Enlace" placeholder="/shop" value={value[key].href} onChange={(v) => setCta(key, "href", v)} error={errors[`${key}.href`]} max={300} />
        </div>
      ))}
      <ImageField label="Imagen" value={value.image} onChange={(v) => set("image", v)} error={errors.image} />
      <div>
        <span className="text-xs font-semibold text-gray-700">Cifras (máximo {MAX_STATS})</span>
        {errors.stats && <span className="block text-xs text-red-600 mt-1">{errors.stats}</span>}
        {value.stats.map((stat, i) => (
          <div key={stat._key} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end mt-1">
            <TextField label="Valor" placeholder="24/7" value={stat.value} onChange={(v) => setStat(i, "value", v)} error={errors[`stats.${i}.value`]} max={10} />
            <TextField label="Etiqueta" placeholder="Soporte" value={stat[labelKey]} onChange={(v) => setStat(i, labelKey, v)} error={errors[`stats.${i}.${labelKey}`]} max={20} />
            <button
              type="button"
              aria-label="Quitar cifra"
              onClick={() => set("stats", value.stats.filter((_, j) => j !== i))}
              className="mb-1 w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {value.stats.length < MAX_STATS && (
          <button
            type="button"
            onClick={() => set("stats", [...value.stats, { _key: crypto.randomUUID(), value: "", label: "", labelEn: "" }])}
            className="block text-xs font-semibold text-shop_dark_green mt-2"
          >
            + Agregar cifra
          </button>
        )}
      </div>
      <SavingNote pending={pending} />
    </div>
  );
};

export default BannerSection;
