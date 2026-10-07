"use client";

import type { RefObject } from "react";

export type Device = "pc" | "movil";

const PreviewFrame = ({
  frameRef,
  device,
  onLoad,
}: {
  frameRef: RefObject<HTMLIFrameElement | null>;
  device: Device;
  onLoad: () => void;
}) => (
  <div className="flex justify-center min-h-[600px] lg:min-h-0">
    <iframe
      ref={frameRef}
      src="/?vista-previa=1"
      title="Vista previa de la tienda"
      onLoad={onLoad}
      className="h-full min-h-[600px] bg-white rounded-2xl shadow-md border border-black/5 transition-[width]"
      style={{ width: device === "movil" ? 390 : "100%" }}
    />
  </div>
);

export default PreviewFrame;
