"use client";

import { useMemo, useState } from "react";
import { FolderTree, Music2, Plus, RefreshCw, UploadCloud, UserPlus } from "lucide-react";
import type { AdminSnapshot } from "@/lib/catalog";
import { CategoryTreeEditor } from "@/components/admin/category-tree-editor";
import { SongCreateModal } from "@/components/admin/song-create-modal";
import { SongEditor, type SongEditorDraft, type SongEditorPayload } from "@/components/admin/song-editor";
import { UserInvitePanel } from "@/components/admin/user-invite-panel";
import { ActionModal } from "@/components/ui/action-modal";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";

type Tab = "songs" | "categories" | "users" | "versions";
type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (confirmed: boolean) => void;
};

type NoticeDialogState = {
  title: string;
  description: string;
  tone?: "info" | "error";
};

const tabs: { id: Tab; label: string; icon: typeof Music2 }[] = [
  { id: "songs", label: "Canciones", icon: Music2 },
  { id: "categories", label: "Categorias", icon: FolderTree },
  { id: "users", label: "Usuarios", icon: UserPlus },
  { id: "versions", label: "Versionado", icon: UploadCloud },
];

export function AdminDashboard({ initialSnapshot }: { initialSnapshot: AdminSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeTab, setActiveTab] = useState<Tab>("songs");
  const [editingSongId, setEditingSongId] = useState<number | null>(snapshot.songs[0]?.id ?? null);
  const [noticeDialog, setNoticeDialog] = useState<NoticeDialogState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
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
  const tabOptions = useMemo<CustomSelectOption[]>(
    () =>
      tabs.map((tab) => ({
        value: tab.id,
        label: tab.label,
      })),
    [],
  );
  const songOptions = useMemo<CustomSelectOption[]>(
    () => [
      ...(songDraft
        ? [
            {
              value: "draft",
              label: songDraft.title,
              description: "Borrador sin guardar",
            },
          ]
        : []),
      ...snapshot.songs.map((song) => ({
        value: String(song.id),
        label: song.title,
        description: song.isPublished ? "Publicada" : "Borrador",
      })),
    ],
    [snapshot.songs, songDraft],
  );

  async function mutate(url: string, init?: RequestInit) {
    setNoticeDialog(null);

    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      });
    } catch {
      setNoticeDialog({
        title: "No se pudo completar la operacion",
        description: "Revisa tu conexion o intenta nuevamente.",
      });
      return null;
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setNoticeDialog({
        title: "No se pudo completar la operacion",
        description: body?.error ?? "El servidor rechazo la solicitud.",
      });
      return null;
    }

    const next = (await response.json()) as AdminSnapshot;
    setSnapshot(next);
    setRevision((current) => current + 1);
    return next;
  }

  function requestConfirmation(options: Omit<ConfirmDialogState, "resolve">) {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({ ...options, resolve });
    });
  }

  function closeConfirmation(confirmed: boolean) {
    confirmDialog?.resolve(confirmed);
    setConfirmDialog(null);
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
    const song = snapshot.songs.find((item) => item.id === songId);
    const confirmed = await requestConfirmation({
      title: "Eliminar cancion",
      description: `Esta accion eliminara ${song?.title ? `"${song.title}"` : "esta cancion"} y no se puede deshacer.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    const next = await mutate(`/api/admin/songs/${songId}`, { method: "DELETE" });
    setEditingSongId(next?.songs[0]?.id ?? null);
  }

  async function refresh() {
    await mutate("/api/admin/catalog", { method: "GET" });
  }

  async function inviteUser(email: string) {
    setNoticeDialog(null);

    let response: Response;

    try {
      response = await fetch("/api/admin/users/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      setNoticeDialog({
        title: "No se pudo enviar la invitacion",
        description: "Revisa tu conexion o intenta nuevamente.",
        tone: "error",
      });
      return;
    }

    const body = (await response.json().catch(() => null)) as {
      error?: string;
      snapshot?: AdminSnapshot;
      delivery?: { sent: boolean; setupUrl: string };
    } | null;

    if (!response.ok || !body?.snapshot) {
      setNoticeDialog({
        title: "No se pudo crear el usuario",
        description: body?.error ?? "El servidor rechazo la solicitud.",
        tone: "error",
      });
      return;
    }

    setSnapshot(body.snapshot);
    setRevision((current) => current + 1);
    setNoticeDialog({
      title: body.delivery?.sent ? "Invitacion enviada" : "Usuario creado",
      description: body.delivery?.sent
        ? `Se envio un correo a ${email} para crear su password.`
        : `No hay SMTP configurado. Link de creacion: ${body.delivery?.setupUrl ?? ""}`,
      tone: "info",
    });
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
      <div className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(16rem,24rem)_auto] sm:items-end sm:justify-between">
        <CustomSelect
          label="Menu"
          value={activeTab}
          options={tabOptions}
          onChange={(value) => setActiveTab(value as Tab)}
        />

        <button
          type="button"
          onClick={refresh}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 sm:w-auto"
        >
          <RefreshCw aria-hidden="true" size={16} />
          Actualizar
        </button>
      </div>

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

            <CustomSelect
              className="mt-4 sm:hidden"
              label="Seleccionar cancion"
              value={songDraft ? "draft" : editingSongId ? String(editingSongId) : ""}
              options={songOptions}
              placeholder="Seleccionar cancion"
              onChange={selectSong}
            />

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
            const category = snapshot.categories.find((item) => item.id === id);
            const confirmed = await requestConfirmation({
              title: "Eliminar carpeta",
              description: `Esta accion eliminara ${
                category?.name ? `"${category.name}"` : "esta carpeta"
              }. Las canciones no se eliminan.`,
              confirmLabel: "Eliminar",
              cancelLabel: "Cancelar",
            });

            if (confirmed) {
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

      {activeTab === "users" ? (
        <UserInvitePanel users={snapshot.users} onInvite={inviteUser} />
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

      <ActionModal
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description ?? ""}
        tone="danger"
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        onConfirm={() => closeConfirmation(true)}
        onCancel={() => closeConfirmation(false)}
      />

      <ActionModal
        open={Boolean(noticeDialog)}
        title={noticeDialog?.title ?? ""}
        description={noticeDialog?.description ?? ""}
        tone={noticeDialog?.tone ?? "error"}
        confirmLabel="Entendido"
        onConfirm={() => setNoticeDialog(null)}
      />
    </div>
  );
}
