// Store color palettes. No imports: also run by scripts/check-permissions.mjs.

type Theme = {
  name: string;
  primary: string;
  primaryBtn: string;
  light: string;
  accent: string;
  accentLight: string;
  bg: string;
  bgAlt: string;
  dealBg: string;
};

export const THEMES = {
  emerald: {
    name: "Esmeralda",
    primary: "#063c28",
    primaryBtn: "#063d29",
    light: "#3b9c3c",
    accent: "#fb6c08",
    accentLight: "#fca99b",
    bg: "#fcf0e4",
    bgAlt: "#f6f6f6",
    dealBg: "#f1f3f8",
  },
  ocean: {
    name: "Océano",
    primary: "#0c2d57",
    primaryBtn: "#0c2d57",
    light: "#1d6fb8",
    accent: "#0ea5e9",
    accentLight: "#bae6fd",
    bg: "#eff6ff",
    bgAlt: "#f0f9ff",
    dealBg: "#e0f2fe",
  },
  violet: {
    name: "Violeta",
    primary: "#3b0764",
    primaryBtn: "#3b0764",
    light: "#7c3aed",
    accent: "#a855f7",
    accentLight: "#e9d5ff",
    bg: "#faf5ff",
    bgAlt: "#f5f3ff",
    dealBg: "#ede9fe",
  },
  crimson: {
    name: "Carmesí",
    primary: "#7f1d1d",
    primaryBtn: "#7f1d1d",
    light: "#c53030",
    accent: "#ea580c",
    accentLight: "#fed7aa",
    bg: "#fff7ed",
    bgAlt: "#fef3c7",
    dealBg: "#ffedd5",
  },
  rose: {
    name: "Rosa",
    primary: "#881337",
    primaryBtn: "#881337",
    light: "#e11d48",
    accent: "#fb923c",
    accentLight: "#fecaca",
    bg: "#fff1f2",
    bgAlt: "#fdf2f8",
    dealBg: "#ffe4e6",
  },
  slate: {
    name: "Pizarra",
    primary: "#1e293b",
    primaryBtn: "#1e293b",
    light: "#475569",
    accent: "#64748b",
    accentLight: "#cbd5e1",
    bg: "#f8fafc",
    bgAlt: "#f1f5f9",
    dealBg: "#e2e8f0",
  },
} satisfies Record<string, Theme>;

export type ThemeKey = keyof typeof THEMES;

export const DEFAULT_THEME: ThemeKey = "emerald";

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === "string" && Object.hasOwn(THEMES, value);
}

export function themeCssVars(key: string): Record<string, string> {
  const theme = THEMES[isThemeKey(key) ? key : DEFAULT_THEME];
  return {
    "--color-shop_dark_green": theme.primary,
    "--color-shop_btn_dark_green": theme.primaryBtn,
    "--color-shop_light_green": theme.light,
    "--color-shop_orange": theme.accent,
    "--color-lightOrange": theme.accentLight,
    "--color-shop_light_pink": theme.bg,
    "--color-shop_light_bg": theme.bgAlt,
    "--color-deal-bg": theme.dealBg,
  };
}
