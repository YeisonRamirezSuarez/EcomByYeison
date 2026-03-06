"use client";

import React, { useEffect, useState } from "react";
import useStore from "@/store";
import { Palette, X, Check } from "lucide-react";

export const THEMES: Record<
  string,
  {
    name: string;
    primary: string;
    primaryBtn: string;
    light: string;
    accent: string;
    accentLight: string;
    bg: string;
    bgAlt: string;
    dealBg: string;
  }
> = {
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
};

export function applyTheme(themeName: string) {
  const theme = THEMES[themeName];
  if (!theme || typeof window === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--color-shop_dark_green", theme.primary);
  root.style.setProperty("--color-shop_btn_dark_green", theme.primaryBtn);
  root.style.setProperty("--color-shop_light_green", theme.light);
  root.style.setProperty("--color-shop_orange", theme.accent);
  root.style.setProperty("--color-lightOrange", theme.accentLight);
  root.style.setProperty("--color-shop_light_pink", theme.bg);
  root.style.setProperty("--color-shop_light_bg", theme.bgAlt);
  root.style.setProperty("--color-deal-bg", theme.dealBg);
}

const ThemePanel = () => {
  const [open, setOpen] = useState(false);
  const { themeName, setThemeName } = useStore();

  useEffect(() => {
    applyTheme(themeName);
  }, [themeName]);

  const handleSelect = (name: string) => {
    setThemeName(name);
    applyTheme(name);
    setOpen(false);
  };

  const currentTheme = THEMES[themeName] || THEMES.emerald;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-72 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Personalizar tema</h3>
              <p className="text-xs text-gray-400 mt-0.5">Selecciona tu color favorito</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(THEMES).map(([key, theme]) => {
              const isActive = themeName === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  title={theme.name}
                  className={`relative flex items-center gap-3 p-3 rounded-xl transition-all border ${
                    isActive
                      ? "border-2 bg-gray-50 shadow-sm"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                  style={{ borderColor: isActive ? theme.primary : undefined }}
                >
                  <div className="flex gap-1 shrink-0">
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: theme.light }}
                    />
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: theme.accent }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{theme.name}</span>
                  {isActive && (
                    <div
                      className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <Check size={9} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Tu preferencia se guarda automáticamente
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((p) => !p)}
        className="w-13 h-13 w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 hover:shadow-2xl"
        style={{ backgroundColor: currentTheme.primary }}
        title="Personalizar tema"
        aria-label="Abrir panel de tema"
      >
        <Palette size={20} />
      </button>
    </div>
  );
};

export default ThemePanel;
