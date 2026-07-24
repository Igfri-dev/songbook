"use client";

import { useMemo, useRef, useState } from "react";
import { ClipboardPaste, Plus, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import type { AdminCategory, AdminSong } from "@/lib/catalog";
import {
  type SectionType,
  type SongContentData,
  type SongLineData,
  emptySongContent,
  sectionTypes,
} from "@/lib/song-content";
import { contentFromPlainLyrics } from "@/lib/plain-lyrics";
import { InteractiveSongPreview } from "@/components/admin/interactive-song-preview";
import { ChordLineEditor } from "@/components/admin/chord-line-editor";
import { SectionAddModal } from "@/components/admin/section-add-modal";
import { SectionCopyModal } from "@/components/admin/section-copy-modal";
import type { SectionCopyMode } from "@/components/admin/section-copy-menu";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";

export type SongEditorPayload = {
  title: string;
  hasChords: boolean;
  isPublished: boolean;
  categoryId: number | null;
  content: SongContentData;
};

export type SongEditorDraft = SongEditorPayload;

type SongEditorProps = {
  song: AdminSong | null;
  draft?: SongEditorDraft | null;
  categories: AdminCategory[];
  onSave: (songId: number | null, payload: SongEditorPayload) => Promise<void>;
  onDelete: (songId: number) => Promise<void>;
};

export function SongEditor({ song, draft, categories, onSave, onDelete }: SongEditorProps) {
  const initialDraft = song ? null : draft;
  const [title, setTitle] = useState(song?.title ?? initialDraft?.title ?? "");
  const [hasChords, setHasChords] = useState(song?.hasChords ?? initialDraft?.hasChords ?? true);
  const [isPublished, setIsPublished] = useState(song?.isPublished ?? initialDraft?.isPublished ?? false);
  const [categoryId, setCategoryId] = useState<number | null>(
    song?.categories[0]?.categoryId ?? initialDraft?.categoryId ?? null,
  );
  const [content, setContent] = useState<SongContentData>(() =>
    cloneContent(song?.content ?? initialDraft?.content ?? emptySongContent),
  );
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [lyricsDraft, setLyricsDraft] = useState("");
  const [addSectionsOpen, setAddSectionsOpen] = useState(false);
  const [copyRequest, setCopyRequest] = useState<{
    mode: SectionCopyMode;
    targetSectionIndex: number;
  } | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories],
  );
  const categoryOptions = useMemo<CustomSelectOption[]>(
    () => [
      { value: "", label: "Sin categoria" },
      ...sortedCategories.map((category) => ({
        value: String(category.id),
        label: category.name,
      })),
    ],
    [sortedCategories],
  );
  const sectionTypeOptions = useMemo<CustomSelectOption[]>(
    () =>
      sectionTypes.map((type) => ({
        value: type,
        label: sectionTypeLabel(type),
      })),
    [],
  );

  async function submit() {
    setIsSaving(true);
    try {
      await onSave(song?.id ?? null, {
        title,
        hasChords,
        isPublished,
        categoryId,
        content: withOrderedContent(content),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function updateSection(sectionIndex: number, next: SongContentData["sections"][number]) {
    setContent((current) => ({
      sections: current.sections.map((section, index) => (index === sectionIndex ? next : section)),
    }));
  }

  function addSection() {
    setContent((current) => ({
      sections: [
        ...current.sections,
        {
          type: "verse",
          title: nextVerseTitle(current),
          lines: [{ lyrics: "", chords: [] }],
        },
      ],
    }));
  }

  function removeSection(sectionIndex: number) {
    setContent((current) => {
      if (current.sections.length === 1) {
        return emptySongContent;
      }

      return {
        sections: current.sections.filter((_, index) => index !== sectionIndex),
      };
    });
  }

  function applyPastedLyrics() {
    const nextContent = contentFromPlainLyrics(lyricsDraft);
    setContent(nextContent);
  }

  function insertFormattedSections(nextContent: SongContentData, requestedIndex: number) {
    setContent((current) => {
      const insertAt = clamp(requestedIndex, 0, current.sections.length);
      const insertedSections = nextContent.sections.map((section) => ({
        ...section,
        lines: section.lines.map(cloneLine),
      }));
      const sections = [
        ...current.sections.slice(0, insertAt),
        ...insertedSections,
        ...current.sections.slice(insertAt),
      ];

      return {
        sections: renumberAutomaticSections(sections),
      };
    });
    requestAnimationFrame(() => {
      const preview = previewScrollRef.current;
      const insertedSection = preview?.querySelector<HTMLElement>(
        `[data-song-section-index="${requestedIndex}"]`,
      );

      if (!preview || !insertedSection) {
        return;
      }

      const previewRect = preview.getBoundingClientRect();
      const sectionRect = insertedSection.getBoundingClientRect();
      preview.scrollTo({
        top: preview.scrollTop + sectionRect.top - previewRect.top - 16,
        behavior: "smooth",
      });
    });
  }

  function movePreviewChord(sectionIndex: number, lineIndex: number, chordIndex: number, at: number, maxAt: number) {
    setContent((current) => ({
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) {
          return section;
        }

        return {
          ...section,
          lines: section.lines.map((line, currentLineIndex) => {
            if (currentLineIndex !== lineIndex) {
              return line;
            }

            const direction = at >= (line.chords[chordIndex]?.at ?? 0) ? "right" : "left";
            return moveChordWithCollision(line, chordIndex, at, direction, maxAt);
          }),
        };
      }),
    }));
  }

  function addPreviewChord(
    sectionIndex: number,
    lineIndex: number,
    chord: string,
    at: number,
    maxAt: number,
  ) {
    setContent((current) => ({
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) {
          return section;
        }

        return {
          ...section,
          lines: section.lines.map((line, currentLineIndex) => {
            if (currentLineIndex !== lineIndex) {
              return line;
            }

            const chords = [...line.chords, { chord, at }].sort(
              (a, b) => a.at - b.at || a.chord.localeCompare(b.chord),
            );
            return preventChordOverlap({ ...line, chords }, maxAt);
          }),
        };
      }),
    }));
  }

  function deletePreviewChord(sectionIndex: number, lineIndex: number, chordIndex: number) {
    setContent((current) => ({
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) {
          return section;
        }

        return {
          ...section,
          lines: section.lines.map((line, currentLineIndex) =>
            currentLineIndex === lineIndex
              ? { ...line, chords: line.chords.filter((_, index) => index !== chordIndex) }
              : line,
          ),
        };
      }),
    }));
  }

  function editPreviewChord(sectionIndex: number, lineIndex: number, chordIndex: number, chord: string) {
    setContent((current) => ({
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) {
          return section;
        }

        return {
          ...section,
          lines: section.lines.map((line, currentLineIndex) => {
            if (currentLineIndex !== lineIndex) {
              return line;
            }

            return preventChordOverlap({
              ...line,
              chords: line.chords.map((item, index) =>
                index === chordIndex ? { ...item, chord } : item,
              ),
            });
          }),
        };
      }),
    }));
  }

  function copySection(
    sourceSectionIndex: number,
    targetSectionIndex: number,
    mode: SectionCopyMode,
  ) {
    setContent((current) => {
      const sourceSection = current.sections[sourceSectionIndex];
      const targetSection = current.sections[targetSectionIndex];

      if (!sourceSection || !targetSection || sourceSectionIndex === targetSectionIndex) {
        return current;
      }

      return {
        sections: current.sections.map((section, sectionIndex) => {
          if (sectionIndex !== targetSectionIndex) {
            return section;
          }

          if (mode === "lyrics-and-chords") {
            return {
              ...section,
              lines: sourceSection.lines.map(cloneLine),
            };
          }

          if (mode === "lyrics") {
            return {
              ...section,
              lines: sourceSection.lines.map((sourceLine, lineIndex) => ({
                lyrics: sourceLine.lyrics,
                chords: targetSection.lines[lineIndex]?.chords.map((chord) => ({ ...chord })) ?? [],
              })),
            };
          }

          return {
            ...section,
            lines: section.lines.map((line, lineIndex) => {
              const sourceLine = sourceSection.lines[lineIndex];
              const chords = sourceLine?.chords.map((chord) => ({ ...chord })) ?? [];

              return preventChordOverlap({ ...line, chords });
            }),
          };
        }),
      };
    });
  }

  const hasSongContent = content.sections.some((section) =>
    section.lines.some((line) => line.lyrics.trim() || line.chords.length > 0),
  );

  function renderActionButtons() {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {song ? (
          <button
            type="button"
            onClick={() => onDelete(song.id)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            <Trash2 aria-hidden="true" size={16} />
            Eliminar
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={isSaving || !title.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          <Save aria-hidden="true" size={16} />
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid min-h-0 min-w-0 gap-4">
      <section className="min-h-0 min-w-0 rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Edicion</p>
            <h2 className="truncate text-base font-semibold text-stone-950">{title || "Cancion sin titulo"}</h2>
          </div>
          {renderActionButtons()}
        </div>

        <div className="grid min-w-0 gap-4 p-4">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)_minmax(15rem,auto)]">
            <label className="grid min-w-0 gap-2 text-sm font-medium text-stone-800">
              Titulo
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 min-w-0 rounded-md border border-stone-300 px-3 text-stone-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="Nombre de la cancion"
              />
            </label>

            <CustomSelect
              label="Categoria"
              value={categoryId ? String(categoryId) : ""}
              options={categoryOptions}
              onChange={(value) => setCategoryId(value ? Number(value) : null)}
            />

            <div className="grid grid-cols-2 gap-2 self-end">
              <label className="flex h-11 items-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-800">
                <input
                  type="checkbox"
                  checked={hasChords}
                  onChange={(event) => setHasChords(event.target.checked)}
                  className="size-4 accent-emerald-700"
                />
                Acordes
              </label>
              <label className="flex h-11 items-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-800">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(event) => setIsPublished(event.target.checked)}
                  className="size-4 accent-emerald-700"
                />
                Publicada
              </label>
            </div>
          </div>

          <div className="flex justify-end border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={() => setAdvancedMode((value) => !value)}
              className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition sm:w-auto ${
                advancedMode
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 text-stone-700 hover:bg-stone-50"
              }`}
            >
              <SlidersHorizontal aria-hidden="true" size={16} />
              Modo Avanzado
            </button>
          </div>

          {advancedMode ? (
            <div className="grid min-w-0 gap-4">
              <div className="grid min-w-0 gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-stone-950">Pegar letra</h3>
                  <button
                    type="button"
                    onClick={applyPastedLyrics}
                    disabled={!lyricsDraft.trim()}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
                  >
                    <ClipboardPaste aria-hidden="true" size={16} />
                    Crear estructura
                  </button>
                </div>
                <textarea
                  value={lyricsDraft}
                  onChange={(event) => setLyricsDraft(event.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder={"Linea 1\nLinea 2\n\nNueva estrofa"}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addSection}
                  className="inline-flex items-center gap-2 rounded-md border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  <Plus aria-hidden="true" size={16} />
                  Seccion
                </button>
              </div>

              {content.sections.map((section, sectionIndex) => (
                <div
                  key={`${sectionIndex}-${section.type}`}
                  className="grid min-w-0 gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3"
                >
                  <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)_auto]">
                    <CustomSelect
                      value={section.type}
                      options={sectionTypeOptions}
                      onChange={(value) =>
                        updateSection(sectionIndex, {
                          ...section,
                          type: value as SectionType,
                        })
                      }
                    />
                    <input
                      value={section.title}
                      onChange={(event) =>
                        updateSection(sectionIndex, {
                          ...section,
                          title: event.target.value,
                        })
                      }
                      className="h-12 min-w-0 rounded-md border border-stone-300 bg-white px-3 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Titulo de seccion"
                    />
                    <button
                      type="button"
                      onClick={() => removeSection(sectionIndex)}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-rose-200 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 aria-hidden="true" size={15} />
                      Eliminar
                    </button>
                  </div>

                  <div className="grid gap-3">
                    {section.lines.map((line, lineIndex) => (
                      <ChordLineEditor
                        key={`${sectionIndex}-${lineIndex}`}
                        line={line}
                        canMoveUp={lineIndex > 0}
                        canMoveDown={lineIndex < section.lines.length - 1}
                        onMoveUp={() =>
                          updateSection(sectionIndex, {
                            ...section,
                            lines: moveItem(section.lines, lineIndex, lineIndex - 1),
                          })
                        }
                        onMoveDown={() =>
                          updateSection(sectionIndex, {
                            ...section,
                            lines: moveItem(section.lines, lineIndex, lineIndex + 1),
                          })
                        }
                        onDelete={() =>
                          updateSection(sectionIndex, {
                            ...section,
                            lines:
                              section.lines.length > 1
                                ? section.lines.filter((_, index) => index !== lineIndex)
                                : [{ lyrics: "", chords: [] }],
                          })
                        }
                        onChange={(nextLine) =>
                          updateSection(sectionIndex, {
                            ...section,
                            lines: section.lines.map((item, index) =>
                              index === lineIndex ? reconcileLineChange(section.lines[lineIndex], nextLine) : item,
                            ),
                          })
                        }
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateSection(sectionIndex, {
                        ...section,
                        lines: [...section.lines, { lyrics: "", chords: [] }],
                      })
                    }
                    className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    <Plus aria-hidden="true" size={16} />
                    Linea
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex shrink-0 flex-col gap-3 border-b border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700">Vista previa</p>
            <h2 className="mt-1 truncate text-2xl font-semibold text-stone-950">
              {title || "Cancion sin titulo"}
            </h2>
          </div>
          {hasSongContent ? (
            <button
              type="button"
              onClick={() => setAddSectionsOpen(true)}
              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:w-auto"
            >
              <Plus aria-hidden="true" size={18} />
              Estrofas
            </button>
          ) : null}
        </div>
        <div
          ref={previewScrollRef}
          className="min-h-[22rem] max-h-[70dvh] overflow-y-auto overscroll-contain p-4 lg:max-h-none lg:min-h-0 lg:flex-1"
        >
          <InteractiveSongPreview
            content={content}
            onChordMove={movePreviewChord}
            onChordAdd={addPreviewChord}
            onChordDelete={deletePreviewChord}
            onChordEdit={editPreviewChord}
            onSectionCopyRequest={(mode, targetSectionIndex) =>
              setCopyRequest({ mode, targetSectionIndex })
            }
          />
        </div>
      </section>

      {addSectionsOpen ? (
        <SectionAddModal
          existingContent={content}
          onClose={() => setAddSectionsOpen(false)}
          onConfirm={(nextContent, insertAt) => {
            insertFormattedSections(nextContent, insertAt);
            setAddSectionsOpen(false);
          }}
        />
      ) : null}

      {copyRequest ? (
        <SectionCopyModal
          key={`${copyRequest.mode}-${copyRequest.targetSectionIndex}`}
          content={content}
          mode={copyRequest.mode}
          targetSectionIndex={copyRequest.targetSectionIndex}
          onClose={() => setCopyRequest(null)}
          onConfirm={(sourceSectionIndex) => {
            copySection(sourceSectionIndex, copyRequest.targetSectionIndex, copyRequest.mode);
            setCopyRequest(null);
          }}
        />
      ) : null}
    </div>
  );
}

function nextVerseTitle(content: SongContentData) {
  const verseCount = content.sections.filter((section) => section.type === "verse").length;
  return `Verso ${verseCount + 1}`;
}

function cloneLine(line: SongLineData): SongLineData {
  return {
    lyrics: line.lyrics,
    chords: line.chords.map((chord) => ({ ...chord })),
  };
}

function renumberAutomaticSections(sections: SongContentData["sections"]) {
  let sectionNumber = 0;

  return sections.map((section) => {
    if (!/^Estrofa \d+$/i.test(section.title)) {
      return section;
    }

    sectionNumber += 1;
    return {
      ...section,
      title: `Estrofa ${sectionNumber}`,
    };
  });
}

function withOrderedContent(content: SongContentData): SongContentData {
  return {
    sections: content.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => preventChordOverlap(line)),
    })),
  };
}

function reconcileLineChange(previousLine: SongLineData, nextLine: SongLineData): SongLineData {
  if (nextLine.chords.length === 0) {
    return nextLine;
  }

  const changedIndex = findChangedChordIndex(previousLine, nextLine);
  const previousAt = previousLine.chords[changedIndex]?.at ?? nextLine.chords[changedIndex]?.at ?? 0;
  const nextAt = nextLine.chords[changedIndex]?.at ?? 0;
  const direction = nextAt >= previousAt ? "right" : "left";

  return moveChordWithCollision(nextLine, changedIndex, nextAt, direction);
}

function findChangedChordIndex(previousLine: SongLineData, nextLine: SongLineData) {
  const max = Math.max(previousLine.chords.length, nextLine.chords.length);

  for (let index = 0; index < max; index += 1) {
    const previous = previousLine.chords[index];
    const next = nextLine.chords[index];

    if (!previous || !next || previous.at !== next.at || previous.chord !== next.chord) {
      return Math.min(index, Math.max(0, nextLine.chords.length - 1));
    }
  }

  return 0;
}

function moveChordWithCollision(
  line: SongLineData,
  movedIndex: number,
  requestedAt: number,
  direction: "left" | "right",
  maxAt = 240,
): SongLineData {
  const chords = line.chords.map((chord) => ({ ...chord }));

  if (!chords[movedIndex]) {
    return preventChordOverlap(line, maxAt);
  }

  const maxColumn = Math.max(0, maxAt);
  chords[movedIndex].at = clamp(requestedAt, 0, maxColumn);

  if (direction === "left") {
    pushLeft(chords, movedIndex);
    keepWithinLeftEdge(chords, movedIndex, maxColumn);
    pushRight(chords, movedIndex);
  } else {
    pushRight(chords, movedIndex);
    keepWithinRightEdge(chords, movedIndex, maxColumn);
    pushLeft(chords, movedIndex);
  }

  settleChordLine(chords, maxColumn);

  return { ...line, chords };
}

function preventChordOverlap(line: SongLineData, maxAt = 240): SongLineData {
  const chords = line.chords.map((chord) => ({ ...chord }));
  settleChordLine(chords, maxAt);

  return { ...line, chords };
}

function settleChordLine(chords: SongLineData["chords"], maxAt: number) {
  pushRight(chords, 0);
  keepWithinRightEdge(chords, 0, maxAt);
  pushLeft(chords, chords.length - 1);
  keepWithinLeftEdge(chords, chords.length - 1, maxAt);
  pushRight(chords, 0);
}

function pushRight(chords: SongLineData["chords"], startIndex: number) {
  const start = Math.max(0, startIndex);

  for (let index = start + 1; index < chords.length; index += 1) {
    const minimum = chords[index - 1].at + chordFootprint(chords[index - 1].chord);
    if (chords[index].at < minimum) {
      chords[index].at = minimum;
    }
  }
}

function pushLeft(chords: SongLineData["chords"], startIndex: number) {
  const start = Math.min(chords.length - 1, startIndex);

  for (let index = start - 1; index >= 0; index -= 1) {
    const maximum = chords[index + 1].at - chordFootprint(chords[index].chord);
    if (chords[index].at > maximum) {
      chords[index].at = maximum;
    }
  }
}

function keepWithinRightEdge(chords: SongLineData["chords"], startIndex: number, maxAt: number) {
  const last = chords[chords.length - 1];
  if (!last) {
    return;
  }

  const overflow = last.at + chordFootprint(last.chord) - maxAt;
  if (overflow <= 0) {
    return;
  }

  const firstAffected = Math.max(0, startIndex);
  const leftLimit =
    firstAffected === 0
      ? 0
      : chords[firstAffected - 1].at + chordFootprint(chords[firstAffected - 1].chord);
  const availableShift = Math.max(0, chords[firstAffected].at - leftLimit);
  const shift = Math.min(overflow, availableShift);

  for (let index = firstAffected; index < chords.length; index += 1) {
    chords[index].at -= shift;
  }
}

function keepWithinLeftEdge(chords: SongLineData["chords"], startIndex: number, maxAt: number) {
  const first = chords[0];
  if (!first || first.at >= 0) {
    return;
  }

  const lastAffected = Math.min(chords.length - 1, startIndex);
  const rightLimit =
    lastAffected === chords.length - 1
      ? maxAt
      : chords[lastAffected + 1].at - chordFootprint(chords[lastAffected].chord);
  const availableShift = Math.max(0, rightLimit - chords[lastAffected].at);
  const shift = Math.min(-first.at, availableShift);

  for (let index = 0; index <= lastAffected; index += 1) {
    chords[index].at += shift;
  }
}

function chordFootprint(chord: string) {
  return Math.max(3, chord.trim().length + 2);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function cloneContent(content: SongContentData) {
  return JSON.parse(JSON.stringify(content)) as SongContentData;
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function sectionTypeLabel(type: SectionType) {
  const labels: Record<SectionType, string> = {
    intro: "Intro",
    verse: "Verso",
    chorus: "Estribillo",
    bridge: "Puente",
    outro: "Final",
  };

  return labels[type];
}
