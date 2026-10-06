"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { saveBrandSection } from "@/actions/brand";
import type { BannerSettings, Cta } from "@/lib/brand";
import { MAX_STATS, validateBanner } from "@/lib/validation";
import { SectionCard, TextField, useSave } from "./fields";
import ImageField from "./ImageField";

const CTA_LABELS = { primaryCta: "Botón principal", secondaryCta: "Botón secundario" } as const;

const BannerSection = ({ initial }: { initial: BannerSettings }) => {
  const [value, setValue] = useState(initial);
  const { errors, pending, save } = useSave(validateBanner, (v) => saveBrandSection("banner", v));
  const set = <K extends keyof BannerSettings>(key: K, v: BannerSettings[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));
  const setCta = (key: keyof typeof CTA_LABELS, field: keyof Cta, v: string) =>
    setValue((prev) => ({ ...prev, [key]: { ...prev[key], [field]: v } }));
  const setStat = (i: number, field: "value" | "label", v: string) =>
    setValue((prev) => ({
      ...prev,
      stats: prev.stats.map((stat, j) => (j === i ? { ...stat, [field]: v } : stat)),
    }));

  return (
    <SectionCard title="Banner de portada" pending={pending} onSave={() => save(value)}>
      <TextField label="Etiqueta" value={value.badge} onChange={(v) => set("badge", v)} error={errors.badge} max={40} />
      <TextField label="Título" value={value.title} onChange={(v) => set("title", v)} error={errors.title} max={60} />
      <TextField label="Parte resaltada del título" value={value.highlight} onChange={(v) => set("highlight", v)} error={errors.highlight} max={30} />
      <TextField label="Subtítulo" value={value.subtitle} onChange={(v) => set("subtitle", v)} error={errors.subtitle} max={80} />
      <TextField label="Descripción" multiline value={value.description} onChange={(v) => set("description", v)} error={errors.description} max={200} />
      {(Object.keys(CTA_LABELS) as (keyof typeof CTA_LABELS)[]).map((key) => (
        <div key={key} className="grid grid-cols-2 gap-2">
          <TextField label={`${CTA_LABELS[key]}: texto`} value={value[key].label} onChange={(v) => setCta(key, "label", v)} error={errors[`${key}.label`]} max={30} />
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
            <TextField label="Etiqueta" placeholder="Soporte" value={stat.label} onChange={(v) => setStat(i, "label", v)} error={errors[`stats.${i}.label`]} max={20} />
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
            onClick={() => set("stats", [...value.stats, { _key: crypto.randomUUID(), value: "", label: "" }])}
            className="block text-xs font-semibold text-shop_dark_green mt-2"
          >
            + Agregar cifra
          </button>
        )}
      </div>
    </SectionCard>
  );
};

export default BannerSection;
