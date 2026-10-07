"use client";

import { useEffect, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import type { Option } from "@/sanity/queries/adminCatalog";
import {
  MAX_TESTIMONIALS,
  PRODUCT_COUNTS,
  PRODUCT_SOURCES,
  PROMO_BACKGROUNDS,
  SECTION_LABELS,
  isBuiltIn,
  type HomeSection,
  type ProductSource,
  type PromoBackground,
  type SectionKind,
  type Testimonial,
} from "@/lib/homeSections";
import { INPUT, TextField } from "../brand/fields";
import ImageField from "../brand/ImageField";

const INCOMPLETE: Partial<Record<SectionKind, string>> = {
  imageText: "Sube una imagen para que esta sección se vea en la tienda.",
  promo: "Escribe un título para que esta sección se vea en la tienda.",
  products: "Elige una categoría para que esta sección se vea en la tienda.",
  richText: "Escribe el texto para que esta sección se vea en la tienda.",
  testimonials: "Agrega al menos un testimonio para que esta sección se vea en la tienda.",
};

function Choice<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (value: T) => void }) {
  return (
    <div>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label={label}>
        {options.map(([key, text]) => (
          <button
            key={String(key)}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
              value === key ? "bg-shop_dark_green text-white border-shop_dark_green" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

const NumberField = ({ label, value, min, max, error, onChange }: { label: string; value: number | null; min: number; max: number; error?: string; onChange: (value: number | null) => void }) => (
  <label className="block">
    <span className="text-xs font-semibold text-gray-700">{label}</span>
    <input
      type="number"
      min={min}
      max={max}
      step={1}
      value={value ?? ""}
      aria-invalid={Boolean(error)}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={`${INPUT} mt-1`}
    />
    {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
  </label>
);

const Testimonials = ({ items, errors, onChange }: { items: Testimonial[]; errors: Record<string, string>; onChange: (items: Testimonial[]) => void }) => {
  const update = (i: number, patch: Partial<Testimonial>) => onChange(items.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <div className="flex flex-col gap-3">
      {items.map((t, i) => (
        <div key={t._key} className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Testimonio {i + 1}</span>
            <button type="button" aria-label="Quitar testimonio" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <TextField label="Nombre" value={t.name} onChange={(v) => update(i, { name: v })} error={errors[`items.${i}.name`]} max={60} />
          <TextField label="Opinión" multiline value={t.text} onChange={(v) => update(i, { text: v })} error={errors[`items.${i}.text`]} max={300} />
          <div>
            <span className="text-xs font-semibold text-gray-700">Estrellas</span>
            <div className="mt-1 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} estrellas`} aria-pressed={t.rating === n} onClick={() => update(i, { rating: n })}>
                  <Star size={18} className={n <= t.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                </button>
              ))}
            </div>
          </div>
          <ImageField label="Foto (opcional)" value={t.photo} onChange={(v) => update(i, { photo: v })} error={errors[`items.${i}.photo`]} />
        </div>
      ))}
      {errors.items && <span className="text-xs text-red-600">{errors.items}</span>}
      {items.length < MAX_TESTIMONIALS && (
        <button
          type="button"
          onClick={() => onChange([...items, { _key: crypto.randomUUID(), name: "", text: "", textEn: "", rating: 5, photo: null }])}
          className="self-start text-xs font-semibold text-shop_dark_green"
        >
          + Agregar testimonio
        </button>
      )}
    </div>
  );
};

const Fields = ({ section: s, errors, categories, onChange }: { section: HomeSection; errors: Record<string, string>; categories: Option[]; onChange: (s: HomeSection) => void }) => {
  const set = <K extends keyof HomeSection>(key: K, value: HomeSection[K]) => onChange({ ...s, [key]: value });
  const title = <TextField label="Título" value={s.title} onChange={(v) => set("title", v)} error={errors.title} max={80} />;
  const text = (max: number, label = "Texto") => (
    <TextField label={label} multiline value={s.text} onChange={(v) => set("text", v)} error={errors.text} max={max} />
  );
  const button = (
    <div className="grid grid-cols-2 gap-2">
      <TextField label="Botón: texto" value={s.button.label} onChange={(v) => set("button", { ...s.button, label: v })} error={errors["button.label"]} max={30} />
      <TextField label="Enlace" placeholder="/shop" value={s.button.href} onChange={(v) => set("button", { ...s.button, href: v })} error={errors["button.href"]} max={200} />
    </div>
  );

  switch (s.kind) {
    case "productTabs":
    case "brands":
      return title;
    case "categories":
      return (
        <>
          {title}
          <NumberField label="Cuántas mostrar (3 a 12)" min={3} max={12} value={s.count} onChange={(v) => set("count", v)} error={errors.count} />
        </>
      );
    case "blog":
      return (
        <>
          {title}
          <NumberField label="Cuántas entradas (1 a 6; vacío = todas las recientes)" min={1} max={6} value={s.count} onChange={(v) => set("count", v)} error={errors.count} />
        </>
      );
    case "imageText":
      return (
        <>
          <ImageField label="Imagen" value={s.image} onChange={(v) => set("image", v)} error={errors.image} />
          {title}
          {text(500)}
          {button}
          <Choice label="Imagen a la" value={s.imageSide} options={[["left", "Izquierda"], ["right", "Derecha"]]} onChange={(v) => set("imageSide", v)} />
        </>
      );
    case "promo":
      return (
        <>
          {title}
          {text(300)}
          {button}
          <Choice label="Color de fondo" value={s.background} options={Object.entries(PROMO_BACKGROUNDS) as [PromoBackground, string][]} onChange={(v) => set("background", v)} />
          <ImageField label="Imagen de fondo (opcional)" value={s.image} onChange={(v) => set("image", v)} error={errors.image} />
        </>
      );
    case "products":
      return (
        <>
          {title}
          <Choice
            label="Productos"
            value={s.source}
            options={Object.entries(PRODUCT_SOURCES) as [ProductSource, string][]}
            onChange={(v) => onChange({ ...s, source: v, category: v === "category" ? s.category : "" })}
          />
          {s.source === "category" && (
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Categoría</span>
              <select value={s.category} onChange={(e) => set("category", e.target.value)} aria-invalid={Boolean(errors.category)} className={`${INPUT} mt-1`}>
                <option value="">Elige una categoría</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
              {errors.category && <span className="block text-xs text-red-600 mt-1">{errors.category}</span>}
            </label>
          )}
          <Choice label="Cuántos" value={s.count ?? 8} options={PRODUCT_COUNTS.map((n) => [n, String(n)] as [number, string])} onChange={(v) => set("count", v)} />
        </>
      );
    case "richText":
      return (
        <>
          {title}
          {text(2000, "Texto (deja una línea en blanco entre párrafos)")}
          <Choice label="Alineación" value={s.align} options={[["left", "Izquierda"], ["center", "Centro"]]} onChange={(v) => set("align", v)} />
        </>
      );
    case "testimonials":
      return (
        <>
          {title}
          <Testimonials items={s.items} errors={errors} onChange={(items) => set("items", items)} />
        </>
      );
    case "newsletter":
      return (
        <>
          {title}
          {text(300)}
        </>
      );
    default:
      return null;
  }
};

// The banner's own form (BannerSection) stays mounted in AppearanceEditor so its state survives
// going back to the list; for the banner this component only shows the header.
const SectionForm = ({
  section,
  shown,
  categoryGone,
  errors,
  categories,
  onChange,
  onBack,
  onRemove,
}: {
  section: HomeSection;
  shown: boolean;
  categoryGone: boolean;
  errors: Record<string, string>;
  categories: Option[];
  onChange: (section: HomeSection) => void;
  onBack: () => void;
  onRemove: () => void;
}) => {
  const [confirm, setConfirm] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={onBack} className="self-start text-sm font-semibold text-shop_orange">
        ← Secciones
      </button>
      <h2 ref={heading} tabIndex={-1} className="font-bold text-gray-900 outline-none">{SECTION_LABELS[section.kind]}</h2>
      {!shown && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {categoryGone ? "La categoría elegida ya no existe; elige otra." : INCOMPLETE[section.kind]}
        </p>
      )}
      {section.kind !== "banner" && <Fields section={section} errors={errors} categories={categories} onChange={onChange} />}
      {!isBuiltIn(section.kind) &&
        (confirm ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            ¿Quitar esta sección del inicio?
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={onRemove} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
                Quitar
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="self-start text-sm font-semibold text-red-700">
            Quitar sección
          </button>
        ))}
    </div>
  );
};

export default SectionForm;
