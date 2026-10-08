// Store-wide styles edited in Apariencia → Estilos. Pure, and no runtime import of adminText: store
// client components use it. The panel-language validateStyles lives in lib/stylesValidate.ts.
import type { AdminText } from "./adminText/index.ts";

export const FONTS = {
  poppins: "Poppins",
  inter: "Inter",
  montserrat: "Montserrat",
  nunito: "Nunito",
  lato: "Lato",
  dmSans: "DM Sans",
  playfair: "Playfair Display",
  raleway: "Raleway",
} as const;
export type FontKey = keyof typeof FONTS;

export const COLOR_FIELDS = {
  primary: "Principal · títulos y menú",
  button: "Botones",
  accent: "Acento · ofertas e insignias",
  secondary: "Secundario",
  background: "Fondo",
} as const satisfies Record<string, AdminText>;
export type ColorField = keyof typeof COLOR_FIELDS;

export const CORNERS = { square: "Rectas", soft: "Suaves", round: "Redondas" } as const satisfies Record<string, AdminText>;
export type Corners = keyof typeof CORNERS;
export const BUTTON_STYLES = { filled: "Rellenos", outline: "Con borde" } as const satisfies Record<string, AdminText>;
export type ButtonStyle = keyof typeof BUTTON_STYLES;

export type Styles = {
  colors: Partial<Record<ColorField, string>>;
  headingFont: FontKey;
  bodyFont: FontKey;
  corners: Corners;
  buttons: ButtonStyle;
};

export const DEFAULT_STYLES: Styles = { colors: {}, headingFont: "poppins", bodyFont: "poppins", corners: "soft", buttons: "filled" };

// Matches the variable names declared in app/fonts.ts.
export const fontVar = (key: FontKey) => `var(--font-f-${key})`;

const HEX = /^#[0-9a-fA-F]{6}$/;
const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function parseStyles(input: unknown, errors: Record<string, AdminText>): Styles {
  const v = asObject(input);
  const rawColors = asObject(v.colors);
  const colors: Styles["colors"] = {};
  for (const field of Object.keys(COLOR_FIELDS) as ColorField[]) {
    const c = rawColors[field];
    if (c === undefined || c === null || c === "") continue;
    if (typeof c === "string" && HEX.test(c)) colors[field] = c.toLowerCase();
    else errors[`colors.${field}`] = "Color inválido";
  }
  const choose = <T extends string>(key: string, options: Record<T, string>, fallback: T): T => {
    const raw = v[key];
    if (raw === undefined || raw === null || raw === "") return fallback;
    if (typeof raw === "string" && Object.hasOwn(options, raw)) return raw as T;
    errors[key] = "Opción inválida";
    return fallback;
  };
  return {
    colors,
    headingFont: choose("headingFont", FONTS, "poppins"),
    bodyFont: choose("bodyFont", FONTS, "poppins"),
    corners: choose("corners", CORNERS, "soft"),
    buttons: choose("buttons", BUTTON_STYLES, "filled"),
  };
}

// Errors are the Spanish AdminText keys; lib/stylesValidate.ts turns them into the panel language.
export function checkStyles(input: unknown): { value: Styles; errors: Record<string, AdminText> } {
  const errors: Record<string, AdminText> = {};
  const value = parseStyles(input, errors);
  return { value, errors };
}

// Lenient read of what Sanity has: an invalid field falls back to its default.
export const readStyles = (raw: unknown): Styles => parseStyles(raw, {});

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// t = share of b (0..1).
export function mixHex(a: string, b: string, t: number): string {
  const [ca, cb] = [rgb(a), rgb(b)];
  return `#${ca.map((c, i) => Math.round(c * (1 - t) + cb[i] * t).toString(16).padStart(2, "0")).join("")}`;
}

// WCAG contrast ratio, 1 (same color) to 21 (black on white).
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = rgb(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
export const MIN_CONTRAST = 4.5;

const COLOR_VARS: Record<ColorField, string> = {
  primary: "--color-shop_dark_green",
  button: "--color-shop_btn_dark_green",
  accent: "--color-shop_orange",
  secondary: "--color-shop_light_green",
  background: "--color-shop_light_pink",
};
// --radius drives rounded-sm…xl (app/globals.css); 2xl/3xl are Tailwind's own variables.
const RADIUS: Record<Corners, [string, string, string]> = {
  square: ["0rem", "0rem", "0rem"],
  soft: ["0.625rem", "1rem", "1.5rem"],
  round: ["1rem", "1.5rem", "2rem"],
};

// base = themeCssVars(theme). Own colors override the palette and the soft tones derive from them.
export function styleCssVars(base: Record<string, string>, styles: Styles): Record<string, string> {
  const vars = { ...base };
  for (const field of Object.keys(COLOR_VARS) as ColorField[]) {
    const color = styles.colors[field];
    if (color) vars[COLOR_VARS[field]] = color;
  }
  if (styles.colors.accent) {
    const soft = mixHex(styles.colors.accent, "#ffffff", 0.7);
    vars["--color-lightOrange"] = soft;
    vars["--color-deal-bg"] = soft;
  }
  if (styles.colors.background || styles.colors.primary) {
    vars["--color-shop_light_bg"] = mixHex(vars["--color-shop_light_pink"], vars["--color-shop_dark_green"], 0.06);
  }
  const [radius, radius2xl, radius3xl] = RADIUS[styles.corners];
  vars["--radius"] = radius;
  vars["--radius-2xl"] = radius2xl;
  vars["--radius-3xl"] = radius3xl;
  vars["--store-font-heading"] = fontVar(styles.headingFont);
  vars["--store-font-body"] = fontVar(styles.bodyFont);
  return vars;
}
