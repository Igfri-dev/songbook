"use client";

import { Check, Edit3, Plus, Trash2, X } from "lucide-react";
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useState,
} from "react";
import type { SongContentData } from "@/lib/song-content";

const sectionLabels: Record<string, string> = {
  intro: "Intro",
  verse: "Verso",
  chorus: "Estribillo",
  bridge: "Puente",
  outro: "Final",
};

type ChordStyle = CSSProperties & {
  "--at": number;
};

type Selection =
  | {
      type: "add";
      sectionIndex: number;
      lineIndex: number;
      at: number;
      maxAt: number;
      chord: string;
    }
  | {
      type: "chord";
      sectionIndex: number;
      lineIndex: number;
      chordIndex: number;
      at: number;
      chord: string;
      editing: boolean;
    };

type InteractiveSongPreviewProps = {
  content: SongContentData;
  onChordMove: (
    sectionIndex: number,
    lineIndex: number,
    chordIndex: number,
    at: number,
    maxAt: number,
  ) => void;
  onChordAdd: (
    sectionIndex: number,
    lineIndex: number,
    chord: string,
    at: number,
    maxAt: number,
  ) => void;
  onChordDelete: (sectionIndex: number, lineIndex: number, chordIndex: number) => void;
  onChordEdit: (
    sectionIndex: number,
    lineIndex: number,
    chordIndex: number,
    chord: string,
  ) => void;
};

let measureCanvas: HTMLCanvasElement | null = null;

export function InteractiveSongPreview({
  content,
  onChordMove,
  onChordAdd,
  onChordDelete,
  onChordEdit,
}: InteractiveSongPreviewProps) {
  const [selection, setSelection] = useState<Selection | null>(null);

  function beginDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    sectionIndex: number,
    lineIndex: number,
    chordIndex: number,
    chordLabel: string,
  ) {
    const lineElement = event.currentTarget.closest<HTMLElement>("[data-editable-chord-line]");

    if (!lineElement) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    let didDrag = false;

    const updateFromPointer = (pointerEvent: Pick<PointerEvent, "clientX">) => {
      const position = pointerToAt(pointerEvent.clientX, lineElement);
      onChordMove(sectionIndex, lineIndex, chordIndex, position.at, position.maxAt);
    };
    const move = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== event.pointerId) {
        return;
      }

      const distance = Math.hypot(pointerEvent.clientX - startX, pointerEvent.clientY - startY);
      if (distance < 4 && !didDrag) {
        return;
      }

      didDrag = true;
      setSelection(null);
      pointerEvent.preventDefault();
      updateFromPointer(pointerEvent);
    };
    const end = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== event.pointerId) {
        return;
      }

      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);

      if (!didDrag) {
        const currentAt =
          content.sections[sectionIndex]?.lines[lineIndex]?.chords[chordIndex]?.at ?? 0;
        setSelection({
          type: "chord",
          sectionIndex,
          lineIndex,
          chordIndex,
          at: currentAt,
          chord: chordLabel,
          editing: false,
        });
      }
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  function selectBlankSpace(
    event: ReactMouseEvent<HTMLDivElement>,
    sectionIndex: number,
    lineIndex: number,
  ) {
    if (
      (event.target as HTMLElement).closest("[data-chord-token]") ||
      (event.target as HTMLElement).closest("[data-chord-popover]")
    ) {
      return;
    }

    const lineElement = event.currentTarget.closest<HTMLElement>("[data-editable-chord-line]");
    if (!lineElement) {
      return;
    }

    const position = pointerToAt(event.clientX, lineElement);
    setSelection({
      type: "add",
      sectionIndex,
      lineIndex,
      at: position.at,
      maxAt: position.maxAt,
      chord: "",
    });
  }

  function addSelectedChord() {
    if (selection?.type !== "add" || !selection.chord.trim()) {
      return;
    }

    onChordAdd(
      selection.sectionIndex,
      selection.lineIndex,
      selection.chord.trim(),
      selection.at,
      selection.maxAt,
    );
    setSelection(null);
  }

  function saveSelectedChord() {
    if (selection?.type !== "chord" || !selection.chord.trim()) {
      return;
    }

    onChordEdit(
      selection.sectionIndex,
      selection.lineIndex,
      selection.chordIndex,
      selection.chord.trim(),
    );
    setSelection({ ...selection, editing: false });
  }

  function deleteSelectedChord() {
    if (selection?.type !== "chord") {
      return;
    }

    onChordDelete(selection.sectionIndex, selection.lineIndex, selection.chordIndex);
    setSelection(null);
  }

  return (
    <div className="grid gap-8">
      {content.sections.map((section, sectionIndex) => (
        <section key={`${section.type}-${sectionIndex}`} className="grid gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-stone-900">
              {section.title || sectionLabels[section.type] || "Seccion"}
            </h2>
            <span className="h-px flex-1 bg-stone-200" />
          </div>

          <div className="grid gap-1">
            {section.lines.map((line, lineIndex) => (
              <div
                key={`${sectionIndex}-${lineIndex}`}
                className="chord-line"
                data-editable-chord-line
              >
                <div
                  className="chord-layer chord-layer-editable"
                  onClick={(event) => selectBlankSpace(event, sectionIndex, lineIndex)}
                >
                  {line.chords.map((chord, chordIndex) => (
                    <button
                      key={`${chord.chord}-${chordIndex}`}
                      type="button"
                      data-chord-token
                      className="chord-token chord-token-editable"
                      style={{ "--at": Math.max(0, chord.at) } as ChordStyle}
                      onPointerDown={(event) =>
                        beginDrag(event, sectionIndex, lineIndex, chordIndex, chord.chord)
                      }
                      aria-label={`Mover o editar acorde ${chord.chord}`}
                    >
                      {chord.chord}
                    </button>
                  ))}

                  {selection?.type === "add" &&
                  selection.sectionIndex === sectionIndex &&
                  selection.lineIndex === lineIndex ? (
                    <div
                      data-chord-popover
                      className="chord-popover"
                      style={{ "--at": selection.at } as ChordStyle}
                    >
                      <input
                        autoFocus
                        value={selection.chord}
                        onChange={(event) =>
                          setSelection({ ...selection, chord: event.target.value })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            addSelectedChord();
                          }
                          if (event.key === "Escape") {
                            setSelection(null);
                          }
                        }}
                        className="h-8 w-20 rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-emerald-600"
                        placeholder="MI"
                      />
                      <button
                        type="button"
                        onClick={addSelectedChord}
                        className="grid size-8 place-items-center rounded-md bg-emerald-700 text-white hover:bg-emerald-800"
                        aria-label="Agregar acorde"
                      >
                        <Plus aria-hidden="true" size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelection(null)}
                        className="grid size-8 place-items-center rounded-md border border-stone-300 text-stone-600 hover:bg-stone-50"
                        aria-label="Cerrar"
                      >
                        <X aria-hidden="true" size={15} />
                      </button>
                    </div>
                  ) : null}

                  {selection?.type === "chord" &&
                  selection.sectionIndex === sectionIndex &&
                  selection.lineIndex === lineIndex ? (
                    <div
                      data-chord-popover
                      className="chord-popover"
                      style={{ "--at": selection.at } as ChordStyle}
                    >
                      {selection.editing ? (
                        <>
                          <input
                            autoFocus
                            value={selection.chord}
                            onChange={(event) =>
                              setSelection({ ...selection, chord: event.target.value })
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                saveSelectedChord();
                              }
                              if (event.key === "Escape") {
                                setSelection({ ...selection, editing: false });
                              }
                            }}
                            className="h-8 w-20 rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-emerald-600"
                          />
                          <button
                            type="button"
                            onClick={saveSelectedChord}
                            className="grid size-8 place-items-center rounded-md bg-emerald-700 text-white hover:bg-emerald-800"
                            aria-label="Guardar acorde"
                          >
                            <Check aria-hidden="true" size={15} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelection({ ...selection, editing: true })}
                          className="grid size-8 place-items-center rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
                          aria-label="Editar acorde"
                        >
                          <Edit3 aria-hidden="true" size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={deleteSelectedChord}
                        className="grid size-8 place-items-center rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50"
                        aria-label="Eliminar acorde"
                      >
                        <Trash2 aria-hidden="true" size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelection(null)}
                        className="grid size-8 place-items-center rounded-md border border-stone-300 text-stone-600 hover:bg-stone-50"
                        aria-label="Cerrar"
                      >
                        <X aria-hidden="true" size={15} />
                      </button>
                    </div>
                  ) : null}
                </div>
                <span className="lyrics-line">{line.lyrics || "\u00a0"}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function pointerToAt(clientX: number, lineElement: HTMLElement) {
  const rect = lineElement.getBoundingClientRect();
  const charWidth = getCharWidth(lineElement);
  const maxVisible = Math.max(0, Math.floor(rect.width / charWidth) - 1);
  const rawAt = Math.round((clientX - rect.left) / charWidth);

  const maxAt = Math.min(240, maxVisible);
  return { at: clamp(rawAt, 0, maxAt), maxAt };
}

function getCharWidth(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  measureCanvas ??= document.createElement("canvas");
  const context = measureCanvas.getContext("2d");

  if (!context) {
    return Number.parseFloat(style.fontSize) * 0.6 || 8;
  }

  context.font = style.font;
  return context.measureText("0").width || Number.parseFloat(style.fontSize) * 0.6 || 8;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
