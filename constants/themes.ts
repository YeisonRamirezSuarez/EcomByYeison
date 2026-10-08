// Store color palettes. Only a type import (pure): also run by scripts/check-permissions.mjs.
import type { AdminText } from "../lib/adminText/index.ts";

type Theme = {
  name: AdminText;
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
  amber: {
    name: "Ámbar",
    primary: "#78350f",
    primaryBtn: "#78350f",
    light: "#f59e0b",
    accent: "#d97706",
    accentLight: "#fde68a",
    bg: "#fffbeb",
    bgAlt: "#fef3c7",
    dealBg: "#fde68a",
  },
  mint: {
    name: "Menta",
    primary: "#064e3b",
    primaryBtn: "#064e3b",
    light: "#10b981",
    accent: "#14b8a6",
    accentLight: "#99f6e4",
    bg: "#ecfdf5",
    bgAlt: "#f0fdfa",
    dealBg: "#ccfbf1",
  },
  sunset: {
    name: "Atardecer",
    primary: "#7c2d12",
    primaryBtn: "#7c2d12",
    light: "#ea580c",
    accent: "#f43f5e",
    accentLight: "#fecdd3",
    bg: "#fff7ed",
    bgAlt: "#fff1f2",
    dealBg: "#ffe4e6",
  },
  indigo: {
    name: "Índigo",
    primary: "#312e81",
    primaryBtn: "#312e81",
    light: "#6366f1",
    accent: "#22d3ee",
    accentLight: "#bae6fd",
    bg: "#eef2ff",
    bgAlt: "#f5f3ff",
    dealBg: "#e0e7ff",
  },
  cobalt: {
    name: "Cobalto",
    primary: "#172554",
    primaryBtn: "#172554",
    light: "#2563eb",
    accent: "#38bdf8",
    accentLight: "#bae6fd",
    bg: "#eff6ff",
    bgAlt: "#dbeafe",
    dealBg: "#bfdbfe",
  },
  forest: {
    name: "Bosque",
    primary: "#14532d",
    primaryBtn: "#14532d",
    light: "#22c55e",
    accent: "#84cc16",
    accentLight: "#d9f99d",
    bg: "#f0fdf4",
    bgAlt: "#dcfce7",
    dealBg: "#bbf7d0",
  },
  lavender: {
    name: "Lavanda",
    primary: "#4c1d95",
    primaryBtn: "#4c1d95",
    light: "#8b5cf6",
    accent: "#c084fc",
    accentLight: "#f3e8ff",
    bg: "#faf5ff",
    bgAlt: "#f3e8ff",
    dealBg: "#e9d5ff",
  },
  coral: {
    name: "Coral",
    primary: "#9a3412",
    primaryBtn: "#9a3412",
    light: "#fb7185",
    accent: "#f97316",
    accentLight: "#fed7aa",
    bg: "#fff7ed",
    bgAlt: "#ffedd5",
    dealBg: "#fed7aa",
  },
  midnight: {
    name: "Medianoche",
    primary: "#0f172a",
    primaryBtn: "#0f172a",
    light: "#334155",
    accent: "#0ea5e9",
    accentLight: "#bae6fd",
    bg: "#f8fafc",
    bgAlt: "#e2e8f0",
    dealBg: "#cbd5e1",
  },
  sand: {
    name: "Arena",
    primary: "#713f12",
    primaryBtn: "#713f12",
    light: "#a16207",
    accent: "#d97706",
    accentLight: "#fde68a",
    bg: "#fffbeb",
    bgAlt: "#fef3c7",
    dealBg: "#fde68a",
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
