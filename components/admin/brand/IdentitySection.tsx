"use client";

import { useState } from "react";
import { saveAppearanceDraft } from "@/actions/appearance";
import type { IdentitySettings } from "@/lib/brand";
import { validateIdentity } from "@/lib/validation";
import { TextField, useAutosave, SavingNote, type AutosaveEvents } from "./fields";
import ImageField from "./ImageField";

const IdentitySection = ({ initial, ...events }: { initial: IdentitySettings } & AutosaveEvents) => {
  const [value, setValue] = useState(initial);
  const { errors, pending } = useAutosave(value, validateIdentity, (v) => saveAppearanceDraft("identity", v), events);
  const set = <K extends keyof IdentitySettings>(key: K, v: IdentitySettings[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));

  return (
    <div className="flex flex-col gap-3">
      <TextField label="Nombre de la tienda" value={value.storeName} onChange={(v) => set("storeName", v)} error={errors.storeName} max={60} />
      <TextField label="Eslogan" value={value.tagline} onChange={(v) => set("tagline", v)} error={errors.tagline} max={80} />
      <TextField label="Descripción" multiline value={value.description} onChange={(v) => set("description", v)} error={errors.description} max={300} />
      <fieldset>
        <legend className="text-xs font-semibold text-gray-700">Logo</legend>
        <div className="flex gap-4 mt-1 text-sm">
          {(["text", "image"] as const).map((type) => (
            <label key={type} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="logoType"
                checked={value.logoType === type}
                onChange={() => set("logoType", type)}
              />
              {type === "text" ? "Texto" : "Imagen"}
            </label>
          ))}
        </div>
        {errors.logoType && <span className="block text-xs text-red-600 mt-1">{errors.logoType}</span>}
      </fieldset>
      {value.logoType === "text" ? (
        <>
          <TextField label="Texto principal" value={value.logoText} onChange={(v) => set("logoText", v)} error={errors.logoText} max={30} />
          <TextField label="Texto secundario" value={value.logoSubtext} onChange={(v) => set("logoSubtext", v)} error={errors.logoSubtext} max={30} />
        </>
      ) : (
        <ImageField label="Imagen del logo" value={value.logoImage} onChange={(v) => set("logoImage", v)} error={errors.logoImage} />
      )}
      <ImageField label="Favicon" value={value.favicon} onChange={(v) => set("favicon", v)} error={errors.favicon} />
      <SavingNote pending={pending} />
    </div>
  );
};

export default IdentitySection;
