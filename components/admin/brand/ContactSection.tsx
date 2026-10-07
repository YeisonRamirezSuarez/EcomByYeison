"use client";

import { useState } from "react";
import { saveAppearanceDraft } from "@/actions/appearance";
import type { ContactSettings } from "@/lib/brand";
import type { Locale } from "@/lib/i18n";
import { localeKey } from "@/lib/localize";
import { validateContact } from "@/lib/validation";
import { TextField, useAutosave, SavingNote, type AutosaveEvents } from "./fields";

const FIELDS: { key: "email" | "phone" | "address" | "hours"; label: string; max: number; translated?: boolean }[] = [
  { key: "email", label: "Correo", max: 254 },
  { key: "phone", label: "Teléfono", max: 80 },
  { key: "address", label: "Dirección", max: 80, translated: true },
  { key: "hours", label: "Horario", max: 80, translated: true },
];

const ContactSection = ({ initial, edit, ...events }: { initial: ContactSettings; edit: Locale } & AutosaveEvents) => {
  const [value, setValue] = useState(initial);
  const { errors, pending } = useAutosave(value, validateContact, (v) => saveAppearanceDraft("contact", v), events);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">Los campos vacíos no se muestran en la tienda.</p>
      {FIELDS.map(({ key, label, max, translated }) => {
        const field = (translated ? localeKey(key, edit) : key) as keyof ContactSettings;
        return (
          <TextField key={key} label={label} value={value[field]} onChange={(v) => setValue((prev) => ({ ...prev, [field]: v }))} error={errors[field]} max={max} />
        );
      })}
      <SavingNote pending={pending} />
    </div>
  );
};

export default ContactSection;
