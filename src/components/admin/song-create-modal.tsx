"use client";

import { type FormEvent, useMemo, useState } from "react";
import { ClipboardPaste, Plus, X } from "lucide-react";
import type { AdminCategory } from "@/lib/catalog";
import { contentFromPlainLyrics } from "@/lib/plain-lyrics";
import type { SongEditorDraft } from "@/components/admin/song-editor";

type SongCreateModalProps = {
  categories: AdminCategory[];
  onClose: () => void;
  onCreateDraft: (draft: SongEditorDraft) => void;
};

export function SongCreateModal({ categories, onClose, onCreateDraft }: SongCreateModalProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [hasChords, setHasChords] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [lyrics, setLyrics] = useState("");

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    onCreateDraft({
      title: title.trim(),
      categoryId,
      hasChords,
      isPublished,
      content: contentFromPlainLyrics(lyrics),
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-stone-950/40 px-3 py-4 sm:place-items-center sm:py-8">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-create-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Nueva cancion</p>
            <h2 id="song-create-title" className="truncate text-lg font-semibold text-stone-950">
              Crear desde letra pegada
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
            aria-label="Cerrar"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="grid min-h-0 gap-4 overflow-y-auto p-4">
          <label className="grid gap-2 text-sm font-medium text-stone-800">
            Titulo
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 rounded-md border border-stone-300 px-3 text-stone-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Nombre de la cancion"
              autoFocus
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
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

          <label className="grid gap-2 text-sm font-medium text-stone-800">
            Letra
            <textarea
              value={lyrics}
              onChange={(event) => setLyrics(event.target.value)}
              rows={14}
              className="min-h-64 w-full resize-y rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder={"Linea 1\nLinea 2\n\nNueva estrofa"}
            />
          </label>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-stone-200 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            {lyrics.trim() ? <ClipboardPaste aria-hidden="true" size={17} /> : <Plus aria-hidden="true" size={17} />}
            Continuar a vista previa
          </button>
        </div>
      </form>
    </div>
  );
}
