"use client";

import { useMemo, useState } from "react";
import { FolderTree, Music2, Plus, RefreshCw, UploadCloud } from "lucide-react";
import type { AdminSnapshot } from "@/lib/catalog";
import { CategoryTreeEditor } from "@/components/admin/category-tree-editor";
import { SongCreateModal } from "@/components/admin/song-create-modal";
import { SongEditor, type SongEditorDraft, type SongEditorPayload } from "@/components/admin/song-editor";

type Tab = "songs" | "categories" | "versions";

const tabs: { id: Tab; label: string; icon: typeof Music2 }[] = [
  { id: "songs", label: "Canciones", icon: Music2 },
  { id: "categories", label: "Categorias", icon: FolderTree },
  { id: "versions", label: "Versionado", icon: UploadCloud },
];

export function AdminDashboard({ initialSnapshot }: { initialSnapshot: AdminSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeTab, setActiveTab] = useState<Tab>("songs");
  const [editingSongId, setEditingSongId] = useState<number | null>(snapshot.songs[0]?.id ?? null);
  const [error, setError] = useState("");
  const [versionNotes, setVersionNotes] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [songDraft, setSongDraft] = useState<SongEditorDraft | null>(null);
  const [draftRevision, setDraftRevision] = useState(0);

  const editingSong = useMemo(
    () => snapshot.songs.find((song) => song.id === editingSongId) ?? null,
    [snapshot.songs, editingSongId],
  );

  async function mutate(url: string, init?: RequestInit) {
    setError("");
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo completar la operacion.");
      return null;
    }

    const next = (await response.json()) as AdminSnapshot;
    setSnapshot(next);
    setRevision((current) => current + 1);
    return next;
  }

  async function saveSong(songId: number | null, payload: SongEditorPayload) {
    const next = await mutate(songId ? `/api/admin/songs/${songId}` : "/api/admin/songs", {
      method: songId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    if (!songId && next?.songs[0]) {
      const savedSong = next.songs.find((song) => song.title === payload.title) ?? next.songs[0];
      setSongDraft(null);
      setEditingSongId(savedSong.id);
    }
  }

  async function deleteSong(songId: number) {
    if (!window.confirm("Eliminar esta cancion?")) {
      return;
    }

    const next = await mutate(`/api/admin/songs/${songId}`, { method: "DELETE" });
    setEditingSongId(next?.songs[0]?.id ?? null);
  }

  async function refresh() {
    await mutate("/api/admin/catalog", { method: "GET" });
  }

  function selectSong(value: string) {
    if (value === "draft") {
      setEditingSongId(null);
      return;
    }

    if (!value) {
      setSongDraft(null);
      setEditingSongId(null);
      return;
    }

    setSongDraft(null);
    setEditingSongId(Number(value));
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-stone-900 text-white"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <Icon aria-hidden="true" size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={refresh}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          <RefreshCw aria-hidden="true" size={16} />
          Actualizar
        </button>
      </div>

      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {activeTab === "songs" ? (
        <section className="grid gap-5">
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-950">Canciones</h2>
                <p className="mt-1 text-sm text-stone-600">Crea, edita, elimina y controla publicacion.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto"
              >
                <Plus aria-hidden="true" size={16} />
                Nueva cancion
              </button>
            </div>

            <label className="mt-4 grid gap-2 text-sm font-medium text-stone-800 sm:hidden">
              Seleccionar cancion
              <select
                value={songDraft ? "draft" : editingSongId ?? ""}
                onChange={(event) => selectSong(event.target.value)}
                className="h-11 w-full rounded-md border border-stone-300 px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Seleccionar cancion</option>
                {songDraft ? <option value="draft">{songDraft.title} - borrador sin guardar</option> : null}
                {snapshot.songs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.title} - {song.isPublished ? "Publicada" : "Borrador"}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 hidden gap-2 overflow-x-auto pb-1 sm:flex">
              {songDraft ? (
                <div
                  className="shrink-0 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-sm text-emerald-900"
                >
                  <span className="block font-semibold">{songDraft.title}</span>
                  <span className="text-xs text-emerald-700">Borrador sin guardar</span>
                </div>
              ) : null}
              {snapshot.songs.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => {
                    setSongDraft(null);
                    setEditingSongId(song.id);
                  }}
                  className={`shrink-0 rounded-md border px-3 py-2 text-left text-sm transition ${
                    !songDraft && editingSongId === song.id
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-stone-200 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span className="block font-semibold">{song.title}</span>
                  <span className="text-xs text-stone-500">{song.isPublished ? "Publicada" : "Borrador"}</span>
                </button>
              ))}
            </div>
          </div>

          {editingSong || songDraft ? (
            <SongEditor
              key={
                editingSong
                  ? `${editingSong.id}-${editingSong.updatedAt}-${revision}`
                  : `draft-${draftRevision}`
              }
              song={editingSong}
              draft={songDraft}
              categories={snapshot.categories}
              onSave={saveSong}
              onDelete={deleteSong}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
              Selecciona una cancion o crea una nueva.
            </div>
          )}
        </section>
      ) : null}

      {createModalOpen ? (
        <SongCreateModal
          categories={snapshot.categories}
          onClose={() => setCreateModalOpen(false)}
          onCreateDraft={(draft) => {
            setSongDraft(draft);
            setEditingSongId(null);
            setDraftRevision((current) => current + 1);
            setCreateModalOpen(false);
          }}
        />
      ) : null}

      {activeTab === "categories" ? (
        <CategoryTreeEditor
          key={`categories-${revision}`}
          snapshot={snapshot}
          title="Categorias y catalogo"
          onCreateCategory={async (name, parentId) => {
            await mutate("/api/admin/categories", {
              method: "POST",
              body: JSON.stringify({ name, parentId }),
            });
          }}
          onUpdateCategory={async (id, name, parentId) => {
            await mutate(`/api/admin/categories/${id}`, {
              method: "PUT",
              body: JSON.stringify({ name, parentId }),
            });
          }}
          onDeleteCategory={async (id) => {
            if (window.confirm("Eliminar esta carpeta? Sus canciones no se eliminan.")) {
              await mutate(`/api/admin/categories/${id}`, { method: "DELETE" });
            }
          }}
          onAssignSong={async (songId, categoryId, categorySongId) => {
            await mutate("/api/admin/catalog/assign", {
              method: "POST",
              body: JSON.stringify({ songId, categoryId, categorySongId }),
            });
          }}
          onRemoveAssignment={async (categorySongId) => {
            await mutate(`/api/admin/catalog/assign/${categorySongId}`, { method: "DELETE" });
          }}
          onSaveOrder={async (payload) => {
            await mutate("/api/admin/catalog/order", {
              method: "PUT",
              body: JSON.stringify(payload),
            });
          }}
        />
      ) : null}

      {activeTab === "versions" ? (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-950">Version global</h2>
            <p className="mt-1 text-sm text-stone-600">
              La app Android compara este timestamp con su version local antes de sincronizar.
            </p>

            <div className="mt-5 grid gap-3">
              <label className="grid gap-2 text-sm font-medium text-stone-800">
                Notas
                <textarea
                  value={versionNotes}
                  onChange={(event) => setVersionNotes(event.target.value)}
                  rows={4}
                  className="rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Cambios publicados"
                />
              </label>
              <button
                type="button"
                disabled={publishing}
                onClick={async () => {
                  setPublishing(true);
                  await mutate("/api/admin/catalog/publish-version", {
                    method: "POST",
                    body: JSON.stringify({ notes: versionNotes }),
                  });
                  setVersionNotes("");
                  setPublishing(false);
                }}
                className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-400"
              >
                <UploadCloud aria-hidden="true" size={17} />
                {publishing ? "Publicando..." : "Publicar version"}
              </button>
            </div>
          </div>

          <aside className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-stone-950">Historial</h3>
            <div className="mt-3 grid gap-2">
              {snapshot.versions.map((version) => (
                <div key={version.id} className="rounded-md border border-stone-200 p-3">
                  <p className="text-sm font-semibold text-stone-900">
                    {new Date(version.mainVersion).toLocaleString("es-CL")}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Publicada {new Date(version.publishedAt).toLocaleString("es-CL")}
                  </p>
                  {version.notes ? <p className="mt-2 text-sm text-stone-700">{version.notes}</p> : null}
                </div>
              ))}
            </div>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
