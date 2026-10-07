"use client";

import { useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Plus } from "lucide-react";
import { MAX_SECTIONS, NEW_KINDS, SECTION_HINTS, SECTION_LABELS, type HomeSection, type NewKind } from "@/lib/homeSections";

const ICON = "p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30";

const Row = ({
  section,
  first,
  last,
  warning,
  onOpen,
  onMove,
  onToggle,
}: {
  section: HomeSection;
  first: boolean;
  last: boolean;
  warning: boolean;
  onOpen: () => void;
  onMove: (step: -1 | 1) => void;
  onToggle: () => void;
}) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-1.5 py-1.5 text-sm"
    >
      <button type="button" aria-label="Arrastrar para mover" onPointerDown={(e) => controls.start(e)} className="touch-none cursor-grab p-1 text-gray-400">
        <GripVertical size={16} />
      </button>
      <button type="button" id={`section-${section._key}-open`} onClick={onOpen} className={`flex-1 min-w-0 truncate text-left font-semibold ${section.hidden ? "text-gray-400" : "text-gray-800"}`}>
        {SECTION_LABELS[section.kind]}
        {section.title && <span className="font-normal text-gray-500"> · {section.title}</span>}
      </button>
      {warning && (
        <span title="Incompleta: no se muestra en la tienda" className="text-amber-500">
          <AlertTriangle size={15} aria-label="Incompleta" />
        </span>
      )}
      <button type="button" id={`section-${section._key}-up`} aria-label="Subir" disabled={first} onClick={() => onMove(-1)} className={ICON}>
        <ChevronUp size={15} />
      </button>
      <button type="button" id={`section-${section._key}-down`} aria-label="Bajar" disabled={last} onClick={() => onMove(1)} className={ICON}>
        <ChevronDown size={15} />
      </button>
      <button type="button" aria-label={section.hidden ? "Mostrar" : "Ocultar"} aria-pressed={section.hidden} onClick={onToggle} className={ICON}>
        {section.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </Reorder.Item>
  );
};

const SectionList = ({
  sections,
  error,
  isShown,
  onChange,
  onOpen,
  onAdd,
}: {
  sections: HomeSection[];
  error?: string;
  isShown: (section: HomeSection) => boolean;
  onChange: (sections: HomeSection[]) => void;
  onOpen: (key: string) => void;
  onAdd: (kind: NewKind) => void;
}) => {
  const [adding, setAdding] = useState(false);
  const move = (i: number, step: -1 | 1) => {
    const next = [...sections];
    const [item] = next.splice(i, 1);
    next.splice(i + step, 0, item);
    onChange(next);
    // Refocus the moved row's arrow once rendered; at the first/last place that arrow is disabled, so use the other one.
    const edge = i + step === 0 || i + step === sections.length - 1;
    const arrow = (step < 0) !== edge ? "up" : "down";
    // two frames: the first can run before React has moved the row
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(`section-${item._key}-${arrow}`)?.focus()));
  };
  const toggle = (key: string) => onChange(sections.map((s) => (s._key === key ? { ...s, hidden: !s.hidden } : s)));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Secciones del inicio</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Reorder.Group axis="y" values={sections} onReorder={onChange} className="flex flex-col gap-1.5">
        {sections.map((section, i) => (
          <Row
            key={section._key}
            section={section}
            first={i === 0}
            last={i === sections.length - 1}
            warning={!isShown(section)}
            onOpen={() => onOpen(section._key)}
            onMove={(step) => move(i, step)}
            onToggle={() => toggle(section._key)}
          />
        ))}
      </Reorder.Group>
      {sections.length >= MAX_SECTIONS ? (
        <p className="text-xs text-gray-500">Llegaste al máximo de {MAX_SECTIONS} secciones.</p>
      ) : adding ? (
        <div className="flex flex-col gap-1 rounded-xl border border-gray-200 p-2">
          {NEW_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                setAdding(false);
                onAdd(kind);
              }}
              className="rounded-lg px-2 py-1.5 text-left hover:bg-gray-50"
            >
              <span className="block text-sm font-semibold text-gray-800">{SECTION_LABELS[kind]}</span>
              <span className="block text-xs text-gray-500">{SECTION_HINTS[kind]}</span>
            </button>
          ))}
          <button type="button" onClick={() => setAdding(false)} className="self-start px-2 py-1 text-xs font-semibold text-gray-500">
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          id="add-section"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-shop_orange/50 py-2 text-sm font-semibold text-shop_orange hover:bg-shop_orange/5"
        >
          <Plus size={15} /> Agregar sección
        </button>
      )}
    </div>
  );
};

export default SectionList;
