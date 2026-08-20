"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
  CheckSquare2,
  FolderOpen,
  FolderTree,
  Music2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Square,
  Trash2,
  UploadCloud,
  UserPlus,
  X,
} from "lucide-react";
import type { AdminSnapshot, AdminSong } from "@/lib/catalog";
import { CategoryTreeEditor } from "@/components/admin/category-tree-editor";
import { SongCreateModal } from "@/components/admin/song-create-modal";
import { SongEditor, type SongEditorDraft, type SongEditorPayload } from "@/components/admin/song-editor";
import { UserInvitePanel } from "@/components/admin/user-invite-panel";
import { ActionModal } from "@/components/ui/action-modal";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import type { UserRole } from "@/lib/roles";
import { normalizeSongTitle } from "@/lib/song-title";

type Tab = "songs" | "categories" | "users" | "versions";
type SongViewMode = "select" | "carousel" | "list" | "folders";
type SongSortMode = "age" | "alphabetical";
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

const songViewOptions: CustomSelectOption[] = [
  { value: "select", label: "Select", description: "Una canción a la vez" },
  { value: "carousel", label: "Carrusel", description: "Tarjetas en una fila desplazable" },
  { value: "list", label: "List", description: "Filas compactas dentro de un bloque" },
  { value: "folders", label: "Folders", description: "Agrupadas por categoría" },
];
const songSortOptions: CustomSelectOption[] = [
  { value: "age", label: "Antigüedad", description: "Más antiguas primero" },
  { value: "alphabetical", label: "Alfabético", description: "De la A a la Z" },
];
const songPreferencesKey = "cancionero-admin-song-list-preferences";

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
  const [songSearch, setSongSearch] = useState("");
  const [songSearchOpen, setSongSearchOpen] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<number>>(() => new Set());
  const [deletingSongs, setDeletingSongs] = useState(false);
  const [songSettingsOpen, setSongSettingsOpen] = useState(false);
  const [songViewMode, setSongViewMode] = useState<SongViewMode>("carousel");
  const [songSortMode, setSongSortMode] = useState<SongSortMode>("age");
  const [collapsedSongFolders, setCollapsedSongFolders] = useState<Set<string>>(() => new Set());
  const [songPreferencesReady, setSongPreferencesReady] = useState(false);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<number>>(
    () => new Set(initialSnapshot.categories.map((category) => category.id)),
  );
  const songSearchRef = useRef<HTMLDivElement>(null);

  const editingSong = useMemo(
    () => snapshot.songs.find((song) => song.id === editingSongId) ?? null,
    [snapshot.songs, editingSongId],
  );
  const sortedSongs = useMemo(
    () =>
      [...snapshot.songs].sort((a, b) =>
        songSortMode === "alphabetical"
          ? a.title.localeCompare(b.title, "es", { sensitivity: "base" }) || a.id - b.id
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id,
      ),
    [snapshot.songs, songSortMode],
  );
  const matchingSongs = useMemo(() => {
    const query = normalizeSongTitle(songSearch);

    if (!query) {
      return [];
    }

    return snapshot.songs
      .filter((song) => normalizeSongTitle(song.title).includes(query))
      .sort((a, b) => {
        const aTitle = normalizeSongTitle(a.title);
        const bTitle = normalizeSongTitle(b.title);
        const startsDifference = Number(bTitle.startsWith(query)) - Number(aTitle.startsWith(query));

        return startsDifference || a.title.localeCompare(b.title, "es");
      });
  }, [snapshot.songs, songSearch]);
  const selectedSongs = useMemo(
    () => snapshot.songs.filter((song) => selectedSongIds.has(song.id)),
    [selectedSongIds, snapshot.songs],
  );
  const allSongsSelected = snapshot.songs.length > 0 && selectedSongs.length === snapshot.songs.length;
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
      ...sortedSongs.map((song) => ({
        value: String(song.id),
        label: song.title,
      })),
    ],
    [sortedSongs, songDraft],
  );

  const songsByFolder = useMemo(() => {
    const categoryById = new Map(snapshot.categories.map((category) => [category.id, category]));
    const groups = new Map<string, { key: string; label: string; songs: AdminSong[]; sortOrder: number }>();

    for (const song of sortedSongs) {
      const category = categoryById.get(song.categories[0]?.categoryId);
      const key = category ? String(category.id) : "uncategorized";
      const group = groups.get(key) ?? {
        key,
        label: category?.name ?? "Sin categoría",
        songs: [],
        sortOrder: category?.sortOrder ?? Number.MAX_SAFE_INTEGER,
      };
      group.songs.push(song);
      groups.set(key, group);
    }

    return [...groups.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "es"),
    );
  }, [snapshot.categories, sortedSongs]);

  useEffect(() => {
    function closeSongSearch(event: PointerEvent) {
      if (songSearchRef.current && !songSearchRef.current.contains(event.target as Node)) {
        setSongSearchOpen(false);
      }
    }

    function closeSongSearchFromKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSongSearchOpen(false);
      }
    }

    window.addEventListener("pointerdown", closeSongSearch);
    window.addEventListener("keydown", closeSongSearchFromKeyboard);

    return () => {
      window.removeEventListener("pointerdown", closeSongSearch);
      window.removeEventListener("keydown", closeSongSearchFromKeyboard);
    };
  }, []);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(songPreferencesKey) ?? "null") as {
          version?: number;
          view?: SongViewMode;
          sort?: SongSortMode;
          orientation?: "horizontal" | "vertical";
          collapsedFolders?: string[];
        } | null;

        if (
          saved?.view === "list" &&
          saved.version !== 2 &&
          saved.orientation !== "vertical"
        ) {
          setSongViewMode("carousel");
        } else if (saved?.view && songViewOptions.some((option) => option.value === saved.view)) {
          setSongViewMode(saved.view);
        }
        if (saved?.sort && songSortOptions.some((option) => option.value === saved.sort)) {
          setSongSortMode(saved.sort);
        }
        if (Array.isArray(saved?.collapsedFolders)) {
          setCollapsedSongFolders(new Set(saved.collapsedFolders));
        }
      } catch {
        // Ignore malformed or unavailable browser storage.
      } finally {
        setSongPreferencesReady(true);
      }
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (!songPreferencesReady) {
      return;
    }

    try {
      window.localStorage.setItem(
        songPreferencesKey,
        JSON.stringify({
          version: 2,
          view: songViewMode,
          sort: songSortMode,
          collapsedFolders: [...collapsedSongFolders],
        }),
      );
    } catch {
      // The list still works when browser storage is unavailable.
    }
  }, [collapsedSongFolders, songPreferencesReady, songSortMode, songViewMode]);

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
    setExpandedCategoryIds((current) => {
      const previousIds = new Set(snapshot.categories.map((category) => category.id));
      const nextIds = new Set(next.categories.map((category) => category.id));
      const preserved = new Set([...current].filter((id) => nextIds.has(id)));

      next.categories.forEach((category) => {
        if (!previousIds.has(category.id)) {
          preserved.add(category.id);
        }
      });

      return preserved;
    });
    setSnapshot({ ...next, currentUser: next.currentUser ?? snapshot.currentUser });
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

    if (next) {
      setSelectedSongIds((current) => {
        const selected = new Set(current);
        selected.delete(songId);
        return selected;
      });
      setEditingSongId((current) =>
        current && next.songs.some((item) => item.id === current) ? current : next.songs[0]?.id ?? null,
      );
    }
  }

  function toggleSongSelection(songId: number) {
    setSelectedSongIds((current) => {
      const next = new Set(current);

      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }

      return next;
    });
  }

  function toggleAllSongs() {
    setSelectedSongIds(allSongsSelected ? new Set() : new Set(snapshot.songs.map((song) => song.id)));
  }

  async function deleteSelectedSongs() {
    if (selectedSongs.length === 0) {
      return;
    }

    const confirmed = await requestConfirmation({
      title: selectedSongs.length === 1 ? "Eliminar cancion" : "Eliminar canciones",
      description:
        selectedSongs.length === 1
          ? `Esta accion eliminara "${selectedSongs[0].title}" y no se puede deshacer.`
          : `Esta accion eliminara las ${selectedSongs.length} canciones seleccionadas y no se puede deshacer.`,
      confirmLabel: selectedSongs.length === 1 ? "Eliminar cancion" : `Eliminar ${selectedSongs.length} canciones`,
      cancelLabel: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    setDeletingSongs(true);

    try {
      const next = await mutate("/api/admin/songs", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedSongs.map((song) => song.id) }),
      });

      if (next) {
        setSelectedSongIds(new Set());
        setEditingSongId((current) =>
          current && next.songs.some((song) => song.id === current) ? current : next.songs[0]?.id ?? null,
        );
      }
    } finally {
      setDeletingSongs(false);
    }
  }

  async function refresh() {
    await mutate("/api/admin/catalog", { method: "GET" });
  }

  async function inviteUser(email: string, role: UserRole) {
    setNoticeDialog(null);

    let response: Response;

    try {
      response = await fetch("/api/admin/users/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
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
      action?: "create" | "reset";
    } | null;

    if (!response.ok || !body?.snapshot) {
      setNoticeDialog({
        title: "No se pudo crear el usuario",
        description: body?.error ?? "El servidor rechazo la solicitud.",
        tone: "error",
      });
      return;
    }

    setSnapshot({ ...body.snapshot, currentUser: body.snapshot.currentUser ?? snapshot.currentUser });
    setRevision((current) => current + 1);
    setNoticeDialog({
      title: body.action === "reset"
        ? "Link de cambio generado"
        : body.delivery?.sent ? "Invitacion enviada" : "Usuario creado",
      description: body.delivery?.sent
        ? `Se envio un correo a ${email}.`
        : `No hay SMTP configurado. Link: ${body.delivery?.setupUrl ?? ""}`,
      tone: "info",
    });
  }

  async function resetUserPassword(user: AdminSnapshot["users"][number]) {
    await inviteUser(user.email, user.role);
  }

  async function deleteUser(user: AdminSnapshot["users"][number]) {
    const confirmed = await requestConfirmation({
      title: "Eliminar usuario",
      description: `Esta accion eliminara ${user.email} y no se puede deshacer.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    await mutate(`/api/admin/users/${user.id}`, { method: "DELETE" });
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

  function renderSongPills(song: AdminSong, compact = false) {
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex rounded-full px-2 text-xs font-semibold ${compact ? "py-0.5" : "py-1"} ${
            song.isPublished
              ? "bg-sky-100 text-sky-800"
              : "bg-stone-100 text-stone-600"
          }`}
        >
          {song.isPublished ? "Publicada" : "Borrador"}
        </span>
        {song.isComplete ? (
          <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 text-xs font-semibold text-emerald-800 ${compact ? "py-0.5" : "py-1"}`}>
            <CheckCircle2 aria-hidden="true" size={14} />
            Lista
          </span>
        ) : null}
      </span>
    );
  }

  function renderSongRow(song: AdminSong, layout: "horizontal" | "vertical" | "folder" = "vertical") {
    const selected = selectedSongIds.has(song.id);
    const active = !songDraft && editingSongId === song.id;
    const horizontal = layout === "horizontal";
    const vertical = layout === "vertical";

    return (
      <div
        key={song.id}
        className={`flex min-w-0 items-stretch overflow-hidden text-sm transition ${
          horizontal ? "shrink-0 rounded-md border" : vertical ? "border-b last:border-b-0" : "rounded-md border"
        } ${
          selected
            ? "border-rose-300 ring-2 ring-rose-100"
            : active
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-stone-200 bg-white text-stone-700"
        }`}
      >
        <label className="grid min-w-10 cursor-pointer place-items-center border-r border-stone-200 px-2 hover:bg-stone-50">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => toggleSongSelection(song.id)}
            className="size-4 accent-rose-700"
            aria-label={`Seleccionar ${song.title}`}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setSongDraft(null);
            setEditingSongId(song.id);
          }}
          className={`flex min-w-0 flex-1 text-left hover:bg-stone-50 ${
            horizontal
              ? "min-w-44 flex-col gap-1.5 px-3 py-2"
              : "items-center justify-between gap-2 px-3 py-1.5"
          }`}
        >
          <span className={`${horizontal ? "max-w-56" : "min-w-0 flex-1"} truncate font-semibold`}>{song.title}</span>
          {renderSongPills(song, !horizontal)}
        </button>
      </div>
    );
  }

  function toggleSongFolder(folderKey: string) {
    setCollapsedSongFolders((current) => {
      const next = new Set(current);

      if (next.has(folderKey)) {
        next.delete(folderKey);
      } else {
        next.add(folderKey);
      }

      return next;
    });
  }

  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid min-w-0 gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,24rem)_auto] sm:items-end sm:justify-between">
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
        <section className="grid min-w-0 gap-5">
          <div className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-stone-950">Canciones</h2>
                <p className="mt-1 text-sm text-stone-600">
                  {snapshot.songs.length} {snapshot.songs.length === 1 ? "cancion disponible" : "canciones disponibles"}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setSongSettingsOpen((open) => !open)}
                  aria-expanded={songSettingsOpen}
                  className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold sm:w-auto ${
                    songSettingsOpen
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-300 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <Settings2 aria-hidden="true" size={16} />
                  Configuración
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedSongs}
                  disabled={selectedSongs.length === 0 || deletingSongs}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400 disabled:hover:bg-transparent sm:w-auto"
                >
                  <Trash2 aria-hidden="true" size={16} />
                  {deletingSongs
                    ? "Eliminando..."
                    : selectedSongs.length > 0
                      ? `Eliminar (${selectedSongs.length})`
                      : "Eliminar"}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto"
                >
                  <Plus aria-hidden="true" size={16} />
                  Nueva cancion
                </button>
              </div>
            </div>

            {songSettingsOpen ? (
              <div className="mt-4 grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 sm:grid-cols-2">
                <CustomSelect
                  label="Modo de visualización"
                  value={songViewMode}
                  options={songViewOptions}
                  onChange={(value) => setSongViewMode(value as SongViewMode)}
                />
                <CustomSelect
                  label="Ordenamiento"
                  value={songSortMode}
                  options={songSortOptions}
                  onChange={(value) => setSongSortMode(value as SongSortMode)}
                />
              </div>
            ) : null}

            <div ref={songSearchRef} className="relative z-30 mt-4 max-w-xl">
              <label htmlFor="admin-song-search" className="mb-2 block text-sm font-medium text-stone-800">
                Buscar cancion
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  id="admin-song-search"
                  type="text"
                  value={songSearch}
                  onChange={(event) => {
                    setSongSearch(event.target.value);
                    setSongSearchOpen(Boolean(event.target.value.trim()));
                  }}
                  onFocus={() => setSongSearchOpen(Boolean(songSearch.trim()))}
                  role="combobox"
                  aria-expanded={songSearchOpen && Boolean(songSearch.trim())}
                  aria-controls="admin-song-search-results"
                  aria-autocomplete="list"
                  autoComplete="off"
                  className="h-11 w-full rounded-md border border-stone-300 bg-white pl-10 pr-10 text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Escribe el titulo de una cancion"
                />
                {songSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSongSearch("");
                      setSongSearchOpen(false);
                    }}
                    className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                    aria-label="Limpiar busqueda"
                  >
                    <X aria-hidden="true" size={17} />
                  </button>
                ) : null}
              </div>

              {songSearchOpen && songSearch.trim() ? (
                <div
                  id="admin-song-search-results"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-xl"
                >
                  {matchingSongs.length > 0 ? (
                    matchingSongs.map((song) => (
                      <button
                        key={song.id}
                        type="button"
                        role="option"
                        aria-selected={!songDraft && editingSongId === song.id}
                        onClick={() => {
                          setSongDraft(null);
                          setEditingSongId(song.id);
                          setSongSearch(song.title);
                          setSongSearchOpen(false);
                        }}
                        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition hover:bg-stone-50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-stone-900">{song.title}</span>
                        </span>
                        {renderSongPills(song)}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-sm text-stone-500">No hay canciones que coincidan.</p>
                  )}
                </div>
              ) : null}
            </div>

            {snapshot.songs.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={toggleAllSongs}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  aria-pressed={allSongsSelected}
                >
                  {allSongsSelected ? (
                    <CheckSquare2 aria-hidden="true" size={17} className="text-emerald-700" />
                  ) : (
                    <Square aria-hidden="true" size={17} />
                  )}
                  {allSongsSelected ? "Quitar seleccion" : "Seleccionar todas"}
                </button>
                {selectedSongs.length > 0 ? (
                  <p className="text-sm font-medium text-stone-600">
                    {selectedSongs.length} {selectedSongs.length === 1 ? "seleccionada" : "seleccionadas"}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 min-w-0" aria-label="Canciones disponibles">
              {songDraft ? (
                <button
                  type="button"
                  onClick={() => setEditingSongId(null)}
                  className="mb-3 w-full rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-sm text-emerald-900"
                >
                  <span className="block font-semibold">{songDraft.title}</span>
                  <span className="text-xs text-emerald-700">Borrador sin guardar</span>
                </button>
              ) : null}

              {songViewMode === "select" ? (
                <div className="grid gap-2">
                  <CustomSelect
                    label="Seleccionar canción"
                    value={songDraft ? "draft" : editingSongId ? String(editingSongId) : ""}
                    options={songOptions}
                    placeholder="Seleccionar canción"
                    onChange={selectSong}
                  />
                  {editingSong && !songDraft ? renderSongPills(editingSong) : null}
                </div>
              ) : null}

              {songViewMode === "carousel" ? (
                <div className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2">
                  {sortedSongs.map((song) => renderSongRow(song, "horizontal"))}
                </div>
              ) : null}

              {songViewMode === "list" ? (
                <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
                  {sortedSongs.map((song) => renderSongRow(song, "vertical"))}
                </div>
              ) : null}

              {songViewMode === "folders" ? (
                <div className="grid gap-4">
                  {songsByFolder.map((folder) => (
                    <section key={folder.key} className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                      <button
                        type="button"
                        onClick={() => toggleSongFolder(folder.key)}
                        aria-expanded={!collapsedSongFolders.has(folder.key)}
                        aria-controls={`song-folder-${folder.key}`}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-stone-800 hover:bg-stone-100 ${
                          collapsedSongFolders.has(folder.key) ? "" : "border-b border-stone-200"
                        }`}
                      >
                        <ChevronDown
                          aria-hidden="true"
                          size={16}
                          className={`shrink-0 transition-transform ${collapsedSongFolders.has(folder.key) ? "-rotate-90" : ""}`}
                        />
                        <FolderOpen aria-hidden="true" size={17} className="text-emerald-700" />
                        <span className="min-w-0 flex-1 truncate">{folder.label}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-stone-500">
                          {folder.songs.length}
                        </span>
                      </button>
                      {!collapsedSongFolders.has(folder.key) ? (
                        <div id={`song-folder-${folder.key}`} className="grid gap-2 p-2">
                          {folder.songs.map((song) => renderSongRow(song, "folder"))}
                        </div>
                      ) : null}
                    </section>
                  ))}
                </div>
              ) : null}
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
          songs={snapshot.songs}
          onClose={() => setCreateModalOpen(false)}
          onSelectExisting={(songId) => {
            setSongDraft(null);
            setEditingSongId(songId);
            setCreateModalOpen(false);
          }}
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
          expandedCategoryIds={expandedCategoryIds}
          onExpandedCategoryIdsChange={setExpandedCategoryIds}
          onCreateCategory={async (name, parentId) => {
            await mutate("/api/admin/categories", {
              method: "POST",
              body: JSON.stringify({ name, parentId }),
            });
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
        <UserInvitePanel
          users={snapshot.users}
          currentUserId={snapshot.currentUser?.id}
          canCreateAdmin
          canDeleteUsers={snapshot.currentUser?.role === "ADMIN"}
          onInvite={inviteUser}
          onResetPassword={resetUserPassword}
          onDeleteUser={deleteUser}
        />
      ) : null}

      {activeTab === "versions" ? (
        <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
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
                  className="min-w-0 rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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

          <aside className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:self-start">
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
                  {version.notes ? (
                    <p className="mt-2 break-words text-sm text-stone-700">{version.notes}</p>
                  ) : null}
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
