"use client";

import { AlertTriangle } from "lucide-react";
import { THEMES, type ThemeKey } from "@/constants/themes";
import {
  BUTTON_STYLES,
  COLOR_FIELDS,
  CORNERS,
  FONTS,
  MIN_CONTRAST,
  contrastRatio,
  fontVar,
  type ColorField,
  type FontKey,
  type Styles,
} from "@/lib/styles";
import { INPUT } from "../brand/fields";
import ThemePicker from "./ThemePicker";

const PALETTE: Record<ColorField, (key: ThemeKey) => string> = {
  primary: (key) => THEMES[key].primary,
  button: (key) => THEMES[key].primaryBtn,
  accent: (key) => THEMES[key].accent,
  secondary: (key) => THEMES[key].light,
  background: (key) => THEMES[key].bg,
};

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{children}</h3>
);

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Record<T, string>; onChange: (value: T) => void }) {
  return (
    <div className="flex gap-1" role="group">
      {(Object.keys(options) as T[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-semibold ${
            value === key ? "bg-shop_dark_green text-white border-shop_dark_green" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {options[key]}
        </button>
      ))}
    </div>
  );
}

const FontSelect = ({ label, value, sample, onChange }: { label: string; value: FontKey; sample: string; onChange: (value: FontKey) => void }) => (
  <label className="block">
    <span className="text-xs font-semibold text-gray-700">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value as FontKey)} className={`${INPUT} mt-1`}>
      {(Object.keys(FONTS) as FontKey[]).map((key) => (
        <option key={key} value={key}>
          {FONTS[key]}
        </option>
      ))}
    </select>
    <span className="block mt-1 text-base text-gray-800" style={{ fontFamily: `${fontVar(value)}, sans-serif` }}>
      {sample}
    </span>
  </label>
);

const StylesPanel = ({
  theme,
  styles,
  errors,
  onThemeChange,
  onChange,
}: {
  theme: ThemeKey;
  styles: Styles;
  errors: Record<string, string>;
  onThemeChange: (key: ThemeKey) => void;
  onChange: (styles: Styles) => void;
}) => {
  const color = (field: ColorField) => styles.colors[field] ?? PALETTE[field](theme);
  const custom = Object.keys(styles.colors).length > 0;
  const unreadable = contrastRatio("#ffffff", color("button")) < MIN_CONTRAST || contrastRatio("#ffffff", color("primary")) < MIN_CONTRAST;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <Heading>1 · Paleta</Heading>
        <ThemePicker value={theme} onChange={onThemeChange} />
        {custom && (
          <p className="text-xs text-gray-600">
            Paleta personalizada ·{" "}
            <button type="button" onClick={() => onChange({ ...styles, colors: {} })} className="font-semibold text-shop_orange underline">
              Volver a la paleta
            </button>
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Heading>2 · Colores</Heading>
        {(Object.keys(COLOR_FIELDS) as ColorField[]).map((field) => (
          <label key={field} className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="color"
              value={color(field)}
              onChange={(e) => onChange({ ...styles, colors: { ...styles.colors, [field]: e.target.value } })}
              className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
            />
            <span className="flex-1">{COLOR_FIELDS[field]}</span>
            <span className="font-mono text-xs text-gray-400">{color(field)}</span>
            {errors[`colors.${field}`] && <span className="text-xs text-red-600">{errors[`colors.${field}`]}</span>}
          </label>
        ))}
        {unreadable && (
          <p role="status" className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            El texto de los botones puede leerse mal con este color.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Heading>3 · Tipografía</Heading>
        <FontSelect label="Títulos" value={styles.headingFont} sample="Así se ven tus títulos" onChange={(headingFont) => onChange({ ...styles, headingFont })} />
        <FontSelect label="Textos" value={styles.bodyFont} sample="Y así el resto de los textos." onChange={(bodyFont) => onChange({ ...styles, bodyFont })} />
      </section>

      <section className="flex flex-col gap-2">
        <Heading>4 · Esquinas</Heading>
        <Segmented value={styles.corners} options={CORNERS} onChange={(corners) => onChange({ ...styles, corners })} />
      </section>

      <section className="flex flex-col gap-2">
        <Heading>5 · Botones</Heading>
        <Segmented value={styles.buttons} options={BUTTON_STYLES} onChange={(buttons) => onChange({ ...styles, buttons })} />
      </section>
    </div>
  );
};

export default StylesPanel;
