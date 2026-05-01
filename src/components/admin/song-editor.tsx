"use client";

import { useMemo, useState } from "react";
import { Eye, Plus, Save, Trash2 } from "lucide-react";
import type { AdminCategory, AdminSong } from "@/lib/catalog";
import {
  type SectionType,
  type SongContentData,
  emptySongContent,
  sectionTypes,
} from "@/lib/song-content";
import { StructuredSongRenderer } from "@/components/structured-song-renderer";
import { ChordLineEditor } from "@/components/admin/chord-line-editor";

export type SongEditorPayload = {
  title: string;
  hasChords: boolean;
  isPublished: boolean;
  categoryId: number | null;
  content: SongContentData;
};

type SongEditorProps = {
  song: AdminSong | null;
  categories: AdminCategory[];
  onSave: (songId: number | null, payload: SongEditorPayload) => Promise<void>;
  onDelete: (songId: number) => Promise<void>;
};

export function SongEditor({ song, categories, onSave, onDelete }: SongEditorProps) {
  const [title, setTitle] = useState(song?.title ?? "");
  const [hasChords, setHasChords] = useState(song?.hasChords ?? true);
  const [isPublished, setIsPublished] = useState(song?.isPublished ?? false);
  const [categoryId, setCategoryId] = useState<number | null>(song?.categories[0]?.categoryId ?? null);
  const [content, setContent] = useState<SongContentData>(() => cloneContent(song?.content ?? emptySongContent));
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories],
  );

  async function submit() {
    setIsSaving(true);
    await onSave(song?.id ?? null, {
      title,
      hasChords,
      isPublished,
      categoryId,
      content,
    });
    setIsSaving(false);
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
          title: `Verso ${current.sections.length + 1}`,
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

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <label className="grid gap-2 text-sm font-medium text-stone-800">
            Titulo
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 rounded-md border border-stone-300 px-3 text-stone-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Nombre de la cancion"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-stone-800">
            Categoria
            <select
              value={categoryId ?? ""}
              onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : null)}
              className="h-11 rounded-md border border-stone-300 px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Sin categoria</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

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

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-4">
          <h2 className="text-lg font-semibold text-stone-950">Editor de acordes</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((value) => !value)}
              className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <Eye aria-hidden="true" size={16} />
              Vista
            </button>
            <button
              type="button"
              onClick={addSection}
              className="inline-flex items-center gap-2 rounded-md border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
            >
              <Plus aria-hidden="true" size={16} />
              Seccion
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {content.sections.map((section, sectionIndex) => (
            <div key={`${sectionIndex}-${section.type}`} className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="grid gap-2 md:grid-cols-[10rem_1fr_auto]">
                <select
                  value={section.type}
                  onChange={(event) =>
                    updateSection(sectionIndex, {
                      ...section,
                      type: event.target.value as SectionType,
                    })
                  }
                  className="h-10 rounded-md border border-stone-300 bg-white px-2 text-sm outline-none focus:border-emerald-600"
                >
                  {sectionTypes.map((type) => (
                    <option key={type} value={type}>
                      {sectionTypeLabel(type)}
                    </option>
                  ))}
                </select>
                <input
                  value={section.title}
                  onChange={(event) =>
                    updateSection(sectionIndex, {
                      ...section,
                      title: event.target.value,
                    })
                  }
                  className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                  placeholder="Titulo de seccion"
                />
                <button
                  type="button"
                  onClick={() => removeSection(sectionIndex)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
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
                        lines: section.lines.map((item, index) => (index === lineIndex ? nextLine : item)),
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

        <div className="flex flex-wrap justify-between gap-2 border-t border-stone-200 pt-4">
          {song ? (
            <button
              type="button"
              onClick={() => onDelete(song.id)}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              <Trash2 aria-hidden="true" size={16} />
              Eliminar
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={submit}
            disabled={isSaving || !title.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            <Save aria-hidden="true" size={16} />
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </section>

      {showPreview ? (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-4 border-b border-stone-200 pb-3">
            <p className="text-sm font-medium text-emerald-700">Vista previa</p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-950">{title || "Cancion sin titulo"}</h2>
          </div>
          <StructuredSongRenderer content={content} />
        </section>
      ) : null}
    </div>
  );
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
