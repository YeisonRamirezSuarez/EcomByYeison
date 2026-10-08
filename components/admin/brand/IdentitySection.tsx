"use client";

import { useState } from "react";
import { saveAppearanceDraft } from "@/actions/appearance";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";
import type { IdentitySettings } from "@/lib/brand";
import { validateIdentity } from "@/lib/validation";
import { TextField, twin, type TwinLang, useAutosave, SavingNote, type AutosaveEvents } from "./fields";
import ImageField from "./ImageField";

const IdentitySection = ({ initial, lang, ...events }: { initial: IdentitySettings; lang: TwinLang } & AutosaveEvents) => {
  const ui = useAdminLocale();
  const [value, setValue] = useState(initial);
  const { errors, pending } = useAutosave(value, (input) => validateIdentity(input, ui), (v) => saveAppearanceDraft("identity", v), events);
  const set = <K extends keyof IdentitySettings>(key: K, v: IdentitySettings[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));
  const setText = (patch: Record<string, string>) => setValue((prev) => ({ ...prev, ...patch }));

  return (
    <div className="flex flex-col gap-3">
      <TextField label={tr(ui, "Nombre de la tienda")} value={value.storeName} onChange={(v) => set("storeName", v)} error={errors.storeName} max={60} />
      <TextField label={tr(ui, "Eslogan")} {...twin(value, "tagline", lang, setText, errors)} max={80} />
      <TextField label={tr(ui, "Descripción")} multiline {...twin(value, "description", lang, setText, errors)} max={300} />
      <fieldset>
        <legend className="text-xs font-semibold text-gray-700">{tr(ui, "Logo")}</legend>
        <div className="flex gap-4 mt-1 text-sm">
          {(["text", "image"] as const).map((type) => (
            <label key={type} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="logoType"
                checked={value.logoType === type}
                onChange={() => set("logoType", type)}
              />
              {type === "text" ? tr(ui, "Texto") : tr(ui, "Imagen")}
            </label>
          ))}
        </div>
        {errors.logoType && <span className="block text-xs text-red-600 mt-1">{errors.logoType}</span>}
      </fieldset>
      {value.logoType === "text" ? (
        <>
          <TextField label={tr(ui, "Texto principal")} value={value.logoText} onChange={(v) => set("logoText", v)} error={errors.logoText} max={30} />
          <TextField label={tr(ui, "Texto secundario")} value={value.logoSubtext} onChange={(v) => set("logoSubtext", v)} error={errors.logoSubtext} max={30} />
        </>
      ) : (
        <ImageField label={tr(ui, "Imagen del logo")} value={value.logoImage} onChange={(v) => set("logoImage", v)} error={errors.logoImage} />
      )}
      <ImageField label={tr(ui, "Favicon")} value={value.favicon} onChange={(v) => set("favicon", v)} error={errors.favicon} />
      <SavingNote pending={pending} />
    </div>
  );
};

export default IdentitySection;
