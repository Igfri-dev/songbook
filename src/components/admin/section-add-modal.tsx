"use client";

import { ClipboardPaste, Plus, X } from "lucide-react";
import { type FormEvent, useEffect, useId, useMemo, useState } from "react";
import { contentFromPlainLyrics } from "@/lib/plain-lyrics";
import type { SongContentData } from "@/lib/song-content";
import { StructuredSongRenderer } from "@/components/structured-song-renderer";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";

type SectionAddModalProps = {
  existingContent: SongContentData;
  onConfirm: (content: SongContentData, insertAt: number) => void;
  onClose: () => void;
};

const sectionLabels: Record<string, string> = {
  intro: "Intro",
  verse: "Estrofa",
  chorus: "Estribillo",
  bridge: "Puente",
  outro: "Final",
};

export function SectionAddModal({
  existingContent,
  onConfirm,
  onClose,
}: SectionAddModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [lyrics, setLyrics] = useState("");
  const [insertAt, setInsertAt] = useState(existingContent.sections.length);
  const formattedContent = useMemo(
    () => (lyrics.trim() ? contentFromPlainLyrics(lyrics) : null),
    [lyrics],
  );
  const insertionOptions = useMemo<CustomSelectOption[]>(() => {
    const options: CustomSelectOption[] = [
      {
        value: String(existingContent.sections.length),
        label: "Al final de la canción",
        description: `Después de ${sectionTitle(
          existingContent.sections.at(-1),
          existingContent.sections.length - 1,
        )}`,
      },
    ];

    for (let index = 1; index < existingContent.sections.length; index += 1) {
      const previousSection = existingContent.sections[index - 1];
      const nextSection = existingContent.sections[index];

      options.push({
        value: String(index),
        label: `Entre ${sectionTitle(previousSection, index - 1)} y ${sectionTitle(nextSection, index)}`,
        description: `Las nuevas estrofas quedarán antes de ${sectionTitle(nextSection, index)}`,
      });
    }

    return options;
  }, [existingContent.sections]);

  useEffect(() => {
    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeFromEscape);
    return () => window.removeEventListener("keydown", closeFromEscape);
  }, [onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formattedContent) {
      return;
    }

    onConfirm(formattedContent, insertAt);
  }

  const sectionCount = formattedContent?.sections.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-end bg-stone-950/45 p-3 sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Agregar estrofas
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-semibold text-stone-950">
              Nuevas estrofas
            </h2>
            <p id={descriptionId} className="mt-1 text-sm leading-5 text-stone-600">
              Escribe o pega la letra, elige su ubicación y separa cada estrofa con una línea en
              blanco.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
            aria-label="Cerrar"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-4">
          <CustomSelect
            label="Ubicación"
            value={String(insertAt)}
            options={insertionOptions}
            onChange={(value) => setInsertAt(Number(value))}
          />

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <div className="grid min-w-0 content-start gap-3">
              <label htmlFor={`${titleId}-lyrics`} className="text-sm font-semibold text-stone-800">
                Letra y acordes
              </label>
              <textarea
                id={`${titleId}-lyrics`}
                value={lyrics}
                onChange={(event) => setLyrics(event.target.value)}
                rows={15}
                autoFocus
                className="min-h-64 w-full resize-y rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder={"DO       SOL\nPrimera línea de la estrofa\n\nSegunda estrofa"}
              />
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-5 text-emerald-900">
                <p className="font-semibold">Formato automático</p>
                <p className="mt-1">
                  Las líneas de acordes se aplican a la letra inmediatamente inferior. También se
                  reconocen acordes en notación inglesa y anotaciones como “2 veces”.
                </p>
              </div>
            </div>

            <section className="grid min-w-0 content-start gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-stone-800">Vista previa</p>
                {formattedContent ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {sectionCount} {sectionCount === 1 ? "estrofa" : "estrofas"}
                  </span>
                ) : null}
              </div>
              <div className="min-h-64 min-w-0 overflow-x-auto rounded-lg border border-stone-200 bg-stone-50 p-3">
                {formattedContent ? (
                  <StructuredSongRenderer content={formattedContent} />
                ) : (
                  <div className="grid min-h-56 place-items-center text-center text-sm text-stone-500">
                    <div>
                      <ClipboardPaste aria-hidden="true" size={24} className="mx-auto mb-2" />
                      La vista previa aparecerá mientras escribes.
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
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
            type="submit"
            disabled={!formattedContent}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            <Plus aria-hidden="true" size={17} />
            {sectionCount > 0
              ? `Agregar ${sectionCount} ${sectionCount === 1 ? "estrofa" : "estrofas"}`
              : "Agregar estrofas"}
          </button>
        </div>
      </form>
    </div>
  );
}

function sectionTitle(
  section: SongContentData["sections"][number] | undefined,
  index: number,
) {
  if (!section) {
    return `Estrofa ${Math.max(1, index + 1)}`;
  }

  return section.title || `${sectionLabels[section.type] || "Estrofa"} ${index + 1}`;
}
