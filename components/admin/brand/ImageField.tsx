"use client";

import { useRef, useTransition } from "react";
import toast from "react-hot-toast";
import { uploadImage } from "@/actions/brand";
import type { ImageValue } from "@/lib/brand";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";
import { BRAND_IMAGE_TYPES, validateImageFile } from "@/lib/validation";

const BUTTON =
  "px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60";

const ImageField = ({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: ImageValue | null;
  onChange: (value: ImageValue | null) => void;
  error?: string;
}) => {
  const ui = useAdminLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const handleFile = (file: File) => {
    const problem = validateImageFile(file, undefined, ui);
    if (problem) {
      toast.error(problem);
      return;
    }
    const data = new FormData();
    data.append("file", file);
    startTransition(async () => {
      const result = await uploadImage(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onChange(result.data);
    });
  };

  return (
    <div>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <div className="flex items-center gap-3 mt-1">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview of an uploaded asset, can be SVG
          <img src={value.url} alt="" className="h-14 w-14 object-contain rounded-lg border bg-gray-50" />
        ) : (
          <div className="h-14 w-14 rounded-lg border border-dashed bg-gray-50" />
        )}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={pending} className={BUTTON}>
          {pending ? tr(ui, "Subiendo…") : tr(ui, "Subir")}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} disabled={pending} className={BUTTON}>
            {tr(ui, "Quitar")}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={BRAND_IMAGE_TYPES.join(",")}
          className="hidden"
          aria-label={label}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleFile(file);
          }}
        />
      </div>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
};

export default ImageField;
