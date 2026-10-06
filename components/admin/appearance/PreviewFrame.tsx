"use client";

import type { RefObject } from "react";

export type Device = "pc" | "movil";

const PreviewFrame = ({
  frameRef,
  device,
  onDeviceChange,
}: {
  frameRef: RefObject<HTMLIFrameElement | null>;
  device: Device;
  onDeviceChange: (device: Device) => void;
}) => (
  <div className="flex flex-col gap-3 h-full">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-shop_dark_green">Vista previa</span>
      <div className="flex rounded-full bg-white p-0.5 shadow-sm" role="group" aria-label="Dispositivo">
        {(["pc", "movil"] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={device === d}
            onClick={() => onDeviceChange(d)}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${device === d ? "bg-shop_dark_green text-white" : "text-gray-600"}`}
          >
            {d === "pc" ? "PC" : "Móvil"}
          </button>
        ))}
      </div>
    </div>
    <div className="flex-1 flex justify-center min-h-[600px]">
      <iframe
        ref={frameRef}
        src="/?vista-previa=1"
        title="Vista previa de la tienda"
        className="h-full min-h-[600px] bg-white rounded-xl shadow-md border border-black/5 transition-[width]"
        style={{ width: device === "movil" ? 390 : "100%" }}
      />
    </div>
  </div>
);

export default PreviewFrame;
