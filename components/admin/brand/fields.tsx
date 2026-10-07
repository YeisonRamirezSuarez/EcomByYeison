"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { ActionResult } from "@/lib/actionResult";
import { INVALID_FORM, type ValidationResult } from "@/lib/validation";
import { createSaveQueue } from "@/lib/saveQueue";
import type { Locale } from "@/lib/i18n";
import { localeKey, twinError, twinPatch } from "@/lib/localize";

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
  value: string | undefined;
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
          value={value ?? ""}
          maxLength={max}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} mt-1 resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value ?? ""}
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

// The language being edited, the store's main language, and whether the store has just one.
export type TwinLang = { edit: Locale; primary: Locale; single: boolean };

// TextField props bound to the language being edited: "title" or "titleEn". `onChange` gets the
// fields to write (see twinPatch); the error falls back to the main-language field's.
export function twin(
  value: object,
  key: string,
  lang: TwinLang,
  onChange: (patch: Record<string, string>) => void,
  errors: Record<string, string>
) {
  return {
    value: String((value as Record<string, unknown>)[localeKey(key, lang.edit)] ?? ""),
    onChange: (text: string) => onChange(twinPatch(key, text, lang.edit, lang.single)),
    error: twinError(errors, "", key, lang.edit, lang.primary),
  };
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

export type AutosaveEvents = { onSaved: () => void; onError: () => void };

// Every appearance draft save goes through this queue: in order, and flushed before publishing.
export const draftSaves = createSaveQueue();

// Saves a section 1 s after the last change. Invalid input shows field errors and is not sent.
// Compares with the last value sent, so mounting (or React's dev double-mount) never saves.
// The form value (V) can differ from the validated value sent to the server (T).
export function useAutosave<T, V = T>(
  value: V,
  validate: (input: unknown) => ValidationResult<T>,
  action: (value: T) => Promise<ActionResult<null>>,
  events: AutosaveEvents
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const lastSent = useRef(JSON.stringify(value));
  const inFlight = useRef(0);
  const latest = useRef({ validate, action, events });
  useEffect(() => {
    latest.current = { validate, action, events };
  });

  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized === lastSent.current) return;
    return draftSaves.schedule(async () => {
      const { validate, action, events } = latest.current;
      const checked = validate(value);
      if (!checked.ok) {
        setErrors(checked.errors);
        return;
      }
      lastSent.current = serialized;
      inFlight.current++;
      setPending(true);
      const result = await action(checked.value);
      if (--inFlight.current === 0) setPending(false);
      if (!result.ok) {
        lastSent.current = "";
        setErrors(result.errors ?? {});
        events.onError();
        return;
      }
      setErrors({});
      events.onSaved();
    }, 1000);
  }, [value]);

  return { errors, pending };
}

export const SavingNote = ({ pending }: { pending: boolean }) =>
  pending ? <p className="text-xs text-gray-400">Guardando borrador…</p> : null;
