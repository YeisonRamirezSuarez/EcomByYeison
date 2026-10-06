"use client";

import { Check } from "lucide-react";
import { THEMES, type ThemeKey } from "@/constants/themes";

const ThemePicker = ({ value, onChange }: { value: ThemeKey; onChange: (key: ThemeKey) => void }) => (
  <div className="grid grid-cols-2 gap-2">
    {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
      const theme = THEMES[key];
      const active = value === key;
      return (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={active}
          className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
            active ? "border-2 bg-gray-50 shadow-sm" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
          }`}
          style={{ borderColor: active ? theme.primary : undefined }}
        >
          <span className="flex gap-1 shrink-0">
            {[theme.primary, theme.light, theme.accent].map((color) => (
              <span key={color} className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
            ))}
          </span>
          <span className="text-xs font-semibold text-gray-700">{theme.name}</span>
          {active && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
              <Check size={9} className="text-white" />
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default ThemePicker;
