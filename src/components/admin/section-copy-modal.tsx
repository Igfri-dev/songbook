"use client";

import { Copy, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import type { SongContentData } from "@/lib/song-content";
import type { SectionCopyMode } from "@/components/admin/section-copy-menu";
import { StructuredSongRenderer } from "@/components/structured-song-renderer";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";

type SectionCopyModalProps = {
  content: SongContentData;
  mode: SectionCopyMode;
  targetSectionIndex: number;
  onConfirm: (sourceSectionIndex: number) => void;
  onClose: () => void;
};

const sectionLabels: Record<string, string> = {
  intro: "Intro",
  verse: "Verso",
  chorus: "Estribillo",
  bridge: "Puente",
  outro: "Final",
};

const modeLabels: Record<SectionCopyMode, string> = {
  "lyrics-and-chords": "letra y acordes",
  chords: "acordes",
  lyrics: "letra",
};

export function SectionCopyModal({
  content,
  mode,
  targetSectionIndex,
  onConfirm,
  onClose,
}: SectionCopyModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const sourceCandidates = useMemo(
    () =>
      content.sections
        .slice(0, targetSectionIndex)
        .map((section, sectionIndex) => ({ section, sectionIndex }))
        .filter(
          ({ section }) =>
            mode !== "chords" || section.lines.some((line) => line.chords.length > 0),
        ),
    [content.sections, mode, targetSectionIndex],
  );
  const [sourceSectionIndex, setSourceSectionIndex] = useState(() =>
    sourceCandidates.at(-1)?.sectionIndex ?? Math.max(0, targetSectionIndex - 1),
  );
  const sourceSection = content.sections[sourceSectionIndex];
  const targetSection = content.sections[targetSectionIndex];
  const sourceOptions = useMemo<CustomSelectOption[]>(
    () =>
      sourceCandidates.map(({ section, sectionIndex }) => ({
        value: String(sectionIndex),
        label: sectionTitle(section, sectionIndex),
        description: sectionSummary(section),
      })),
    [sourceCandidates],
  );

  useEffect(() => {
    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeFromEscape);
    return () => window.removeEventListener("keydown", closeFromEscape);
  }, [onClose]);

  if (!sourceSection || !targetSection || sourceOptions.length === 0) {
    return null;
  }

  const modeLabel = modeLabels[mode];

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-end bg-stone-950/45 p-3 sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Copiar de otra estrofa
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-semibold text-stone-950">
              Copiar {modeLabel}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm leading-5 text-stone-600">
              Elige una estrofa anterior para copiarla en {sectionTitle(targetSection, targetSectionIndex)}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="grid size-11 shrink-0 place-items-center rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
            aria-label="Cerrar"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-4">
          <CustomSelect
            label="Estrofa de origen"
            value={String(sourceSectionIndex)}
            options={sourceOptions}
            onChange={(value) => setSourceSectionIndex(Number(value))}
          />

          <section className="min-w-0 rounded-lg border border-stone-200 bg-stone-50 p-3 sm:p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Vista previa
                </p>
                <p className="mt-1 text-sm font-medium text-stone-800">
                  {sectionSummary(sourceSection)}
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                Se copiarán {modeLabel}
              </span>
            </div>
            <div className="min-w-0 overflow-x-auto rounded-md border border-stone-200 bg-white p-3">
              <StructuredSongRenderer content={{ sections: [sourceSection] }} />
            </div>
          </section>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-stone-200 bg-white p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(sourceSectionIndex)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Copy aria-hidden="true" size={16} />
            Copiar {modeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function sectionTitle(section: SongContentData["sections"][number], index: number) {
  return section.title || `${sectionLabels[section.type] || "Seccion"} ${index + 1}`;
}

function sectionSummary(section: SongContentData["sections"][number]) {
  const lineCount = section.lines.length;
  const chordCount = section.lines.reduce((total, line) => total + line.chords.length, 0);
  const linesLabel = `${lineCount} ${lineCount === 1 ? "línea" : "líneas"}`;
  const chordsLabel = `${chordCount} ${chordCount === 1 ? "acorde" : "acordes"}`;

  return `${linesLabel} · ${chordsLabel}`;
}
