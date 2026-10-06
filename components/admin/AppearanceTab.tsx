"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import { saveTheme } from "@/actions/admin";
import { THEMES, themeCssVars, type ThemeKey } from "@/constants/themes";

function applyThemeToDocument(key: ThemeKey) {
  for (const [name, value] of Object.entries(themeCssVars(key))) {
    document.documentElement.style.setProperty(name, value);
  }
}

const AppearanceTab = ({ initialTheme }: { initialTheme: ThemeKey }) => {
  const [current, setCurrent] = useState(initialTheme);
  const [pending, startTransition] = useTransition();

  const handleSelect = (key: ThemeKey) =>
    startTransition(async () => {
      const result = await saveTheme(key);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCurrent(key);
      applyThemeToDocument(key);
      toast.success("Paleta guardada para toda la tienda");
    });

  return (
    <div>
      <h3 className="font-bold text-gray-900 text-sm">Paleta de colores</h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        Se aplica a todos los visitantes de la tienda.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
          const theme = THEMES[key];
          const isActive = current === key;
          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={pending}
              title={theme.name}
              className={`relative flex items-center gap-3 p-3 rounded-xl transition-all border disabled:opacity-60 ${
                isActive
                  ? "border-2 bg-gray-50 shadow-sm"
                  : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
              }`}
              style={{ borderColor: isActive ? theme.primary : undefined }}
            >
              <div className="flex gap-1 shrink-0">
                {[theme.primary, theme.light, theme.accent].map((color) => (
                  <div
                    key={color}
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
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
    </div>
  );
};

export default AppearanceTab;
