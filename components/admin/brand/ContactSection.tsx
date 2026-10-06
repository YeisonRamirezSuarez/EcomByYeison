"use client";

import { useState } from "react";
import { saveAppearanceDraft } from "@/actions/appearance";
import type { ContactSettings } from "@/lib/brand";
import { validateContact } from "@/lib/validation";
import { TextField, useAutosave, SavingNote, type AutosaveEvents } from "./fields";

const FIELDS: { key: keyof ContactSettings; label: string; max: number }[] = [
  { key: "email", label: "Correo", max: 254 },
  { key: "phone", label: "Teléfono", max: 80 },
  { key: "address", label: "Dirección", max: 80 },
  { key: "hours", label: "Horario", max: 80 },
];

const ContactSection = ({ initial, ...events }: { initial: ContactSettings } & AutosaveEvents) => {
  const [value, setValue] = useState(initial);
  const { errors, pending } = useAutosave(value, validateContact, (v) => saveAppearanceDraft("contact", v), events);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">Los campos vacíos no se muestran en la tienda.</p>
      {FIELDS.map(({ key, label, max }) => (
        <TextField
          key={key}
          label={label}
          value={value[key]}
          onChange={(v) => setValue((prev) => ({ ...prev, [key]: v }))}
          error={errors[key]}
          max={max}
        />
      ))}
      <SavingNote pending={pending} />
    </div>
  );
};

export default ContactSection;
