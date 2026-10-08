"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";
import { uploadImage } from "@/actions/brand";
import type { ImageValue } from "@/lib/brand";
import { MAX_PRODUCT_IMAGES } from "@/lib/catalog";
import { BRAND_IMAGE_TYPES, validateImageFile } from "@/lib/validation";

const ICON_BUTTON = "p-1 rounded bg-white/90 shadow text-gray-700 disabled:opacity-30";

const ProductImages = ({
  value,
  onChange,
  error,
}: {
  value: ImageValue[];
  // Takes an updater, not a value: an upload finishing late must not undo changes made meanwhile.
  onChange: (change: (images: ImageValue[]) => ImageValue[]) => void;
  error?: string;
}) => {
  const ui = useAdminLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const move = (from: number, to: number) =>
    onChange((images) => {
      const next = [...images];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const upload = (files: File[]) => {
    const room = MAX_PRODUCT_IMAGES - value.length;
    if (files.length > room) toast.error(tr(ui, "Máximo {max} fotos", { max: MAX_PRODUCT_IMAGES }));
    const accepted = files.slice(0, Math.max(0, room)).filter((file) => {
      const problem = validateImageFile(file, undefined, ui);
      if (problem) toast.error(`${file.name}: ${problem}`);
      return !problem;
    });
    if (accepted.length === 0) return;
    startTransition(async () => {
      const uploaded: ImageValue[] = [];
      for (const file of accepted) {
        const data = new FormData();
        data.append("file", file);
        const result = await uploadImage(data);
        if (result.ok) uploaded.push(result.data);
        else toast.error(result.error);
      }
      // The same file uploaded twice is the same Sanity asset: keep it once.
      if (uploaded.length)
        onChange((images) =>
          uploaded
            .reduce((list, image) => (list.some((i) => i.assetId === image.assetId) ? list : [...list, image]), images)
            .slice(0, MAX_PRODUCT_IMAGES)
        );
    });
  };

  return (
    <div>
      <span className="text-xs font-semibold text-gray-700">{tr(ui, "Fotos (la primera es la principal)")}</span>
      <div className="mt-1 grid grid-cols-3 sm:grid-cols-5 gap-2">
        {value.map((image, i) => (
          <div key={image.assetId} className={`relative aspect-square rounded-lg border bg-gray-50 ${i === 0 ? "ring-2 ring-shop_orange" : ""}`}>
            <Image src={`${image.url}?w=240&h=240&fit=max`} alt="" fill sizes="120px" className="object-contain rounded-lg" />
            <div className="absolute inset-x-1 bottom-1 flex justify-between">
              <button type="button" aria-label={tr(ui, "Mover a la izquierda")} disabled={i === 0} onClick={() => move(i, i - 1)} className={ICON_BUTTON}>
                <ChevronLeft size={14} />
              </button>
              <button type="button" aria-label={tr(ui, "Quitar foto")} onClick={() => onChange((images) => images.filter((other) => other.assetId !== image.assetId))} className={ICON_BUTTON}>
                <X size={14} />
              </button>
              <button type="button" aria-label={tr(ui, "Mover a la derecha")} disabled={i === value.length - 1} onClick={() => move(i, i + 1)} className={ICON_BUTTON}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
        {value.length < MAX_PRODUCT_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            {pending ? tr(ui, "Subiendo…") : tr(ui, "+ Subir fotos")}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={BRAND_IMAGE_TYPES.join(",")}
        className="hidden"
        aria-label={tr(ui, "Subir fotos")}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          upload(files);
        }}
      />
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
};

export default ProductImages;