"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { ActionResult } from "@/lib/actionResult";
import { INVALID_FORM, type ValidationResult } from "@/lib/validation";

export const INPUT =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-shop_light_green/40 disabled:opacity-60";

export function TextField({
  label,
  value,
  onChange,
  error,
  max,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  max: number;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          maxLength={max}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} mt-1 resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          maxLength={max}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} mt-1`}
        />
      )}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

export function SectionCard({
  title,
  pending,
  onSave,
  children,
}: {
  title: string;
  pending: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
      {children}
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="self-start bg-shop_dark_green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </section>
  );
}

// Validates in the browser first (same rules as the server), then calls the action.
export function useSave<T>(
  validate: (input: unknown) => ValidationResult<T>,
  action: (value: T) => Promise<ActionResult<null>>,
  onSaved?: (value: T) => void
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const save = (input: unknown) => {
    const checked = validate(input);
    if (!checked.ok) {
      setErrors(checked.errors);
      toast.error(INVALID_FORM);
      return;
    }
    startTransition(async () => {
      const result = await action(checked.value);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        toast.error(result.error);
        return;
      }
      setErrors({});
      onSaved?.(checked.value);
      toast.success("Cambios guardados");
    });
  };

  return { errors, pending, save, clearErrors: () => setErrors({}) };
}
