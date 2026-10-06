"use client";

import { useState } from "react";
import { saveAppearanceDraft } from "@/actions/appearance";
import type { SocialSettings } from "@/lib/brand";
import { SOCIAL_KEYS, SOCIAL_LABELS, validateSocial } from "@/lib/validation";
import { TextField, useAutosave, SavingNote, type AutosaveEvents } from "./fields";

const SocialSection = ({ initial, ...events }: { initial: SocialSettings } & AutosaveEvents) => {
  const [value, setValue] = useState(initial);
  const { errors, pending } = useAutosave(value, validateSocial, (v) => saveAppearanceDraft("social", v), events);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">Pega el enlace de cada red que uses. Las vacías no se muestran.</p>
      {SOCIAL_KEYS.map((key) => (
        <TextField
          key={key}
          label={SOCIAL_LABELS[key]}
          placeholder="https://"
          value={value[key]}
          onChange={(v) => setValue((prev) => ({ ...prev, [key]: v }))}
          error={errors[key]}
          max={300}
        />
      ))}
      <SavingNote pending={pending} />
    </div>
  );
};

export default SocialSection;
