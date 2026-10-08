"use client";

import { useState } from "react";
import { saveAppearanceDraft } from "@/actions/appearance";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";
import type { ContactSettings } from "@/lib/brand";
import { localeKey, twinError, twinPatch } from "@/lib/localize";
import type { AdminText } from "@/lib/adminText";
import { validateContact } from "@/lib/validation";
import { TextField, useAutosave, type TwinLang, SavingNote, type AutosaveEvents } from "./fields";

const FIELDS: { key: "email" | "phone" | "address" | "hours"; label: AdminText; max: number; translated?: boolean }[] = [
  { key: "email", label: "Correo", max: 254 },
  { key: "phone", label: "Teléfono", max: 80 },
  { key: "address", label: "Dirección", max: 80, translated: true },
  { key: "hours", label: "Horario", max: 80, translated: true },
];

const ContactSection = ({ initial, lang, ...events }: { initial: ContactSettings; lang: TwinLang } & AutosaveEvents) => {
  const ui = useAdminLocale();
  const [value, setValue] = useState(initial);
  const { errors, pending } = useAutosave(value, (input) => validateContact(input, ui), (v) => saveAppearanceDraft("contact", v), events);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">{tr(ui, "Los campos vacíos no se muestran en la tienda.")}</p>
      {FIELDS.map(({ key, label, max, translated }) => {
        const field = (translated ? localeKey(key, lang.edit) : key) as keyof ContactSettings;
        const patch = (v: string) => (translated ? twinPatch(key, v, lang.edit, lang.single) : { [key]: v });
        const error = translated ? twinError(errors, "", key, lang.edit, lang.primary) : errors[key];
        return (
          <TextField key={key} label={tr(ui, label)} value={value[field]} onChange={(v) => setValue((prev) => ({ ...prev, ...patch(v) }))} error={error} max={max} />
        );
      })}
      <SavingNote pending={pending} />
    </div>
  );
};

export default ContactSection;
