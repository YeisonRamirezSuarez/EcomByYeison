"use client";

import { useState } from "react";
import { saveBrandSection } from "@/actions/brand";
import type { ContactSettings } from "@/lib/brand";
import { validateContact } from "@/lib/validation";
import { SectionCard, TextField, useSave } from "./fields";

const FIELDS: { key: keyof ContactSettings; label: string; max: number }[] = [
  { key: "email", label: "Correo", max: 254 },
  { key: "phone", label: "Teléfono", max: 80 },
  { key: "address", label: "Dirección", max: 80 },
  { key: "hours", label: "Horario", max: 80 },
];

const ContactSection = ({ initial }: { initial: ContactSettings }) => {
  const [value, setValue] = useState(initial);
  const { errors, pending, save } = useSave(validateContact, (v) => saveBrandSection("contact", v));

  return (
    <SectionCard title="Contacto" pending={pending} onSave={() => save(value)}>
      <p className="text-xs text-gray-500 -mt-2">Los campos vacíos no se muestran en la tienda.</p>
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
    </SectionCard>
  );
};

export default ContactSection;
