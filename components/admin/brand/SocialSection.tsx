"use client";

import { useState } from "react";
import { saveBrandSection } from "@/actions/brand";
import type { SocialSettings } from "@/lib/brand";
import { SOCIAL_KEYS, SOCIAL_LABELS, validateSocial } from "@/lib/validation";
import { SectionCard, TextField, useSave } from "./fields";

const SocialSection = ({ initial }: { initial: SocialSettings }) => {
  const [value, setValue] = useState(initial);
  const { errors, pending, save } = useSave(validateSocial, (v) => saveBrandSection("social", v));

  return (
    <SectionCard title="Redes sociales" pending={pending} onSave={() => save(value)}>
      <p className="text-xs text-gray-500 -mt-2">Pega el enlace de cada red que uses. Las vacías no se muestran.</p>
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
    </SectionCard>
  );
};

export default SocialSection;
