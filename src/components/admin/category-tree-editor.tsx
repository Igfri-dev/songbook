"use client";

import { type CSSProperties, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  GripVertical,
  Minus,
  Music,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { AdminCategory, AdminSnapshot } from "@/lib/catalog";

type LocalLink = {
  id: number;
  categoryId: number;
  songId: number;
  sortOrder: number;
};

type LocalSong = {
  id: number;
  title: string;
  slug: string;
  isPublished: boolean;
};

type TreeNode = AdminCategory & {
  children: TreeNode[];
  songs: (LocalSong & { linkId: number; sortOrder: number })[];
};

type TreeDepthStyle = CSSProperties & {
  "--depth": number;
};

type SearchOption = {
  value: string;
  label: string;
  description?: string;
};

type OrderPayload = {
  categories: {
    id: number;
    parentId: number | null;
    sortOrder: number;
  }[];
  categorySongs: {
    id: number;
    categoryId: number;
    sortOrder: number;
  }[];
};

type CategoryTreeEditorProps = {
  snapshot: AdminSnapshot;
  title: string;
  expandedCategoryIds: Set<number>;
  onExpandedCategoryIdsChange: (ids: Set<number>) => void;
  onCreateCategory: (name: string, parentId: number | null) => Promise<void>;
  onAssignSong: (songId: number, categoryId: number, categorySongId?: number) => Promise<void>;
  onRemoveAssignment: (categorySongId: number) => Promise<void>;
  onSaveOrder: (payload: OrderPayload) => Promise<void>;
};

export function CategoryTreeEditor({
  snapshot,
  title,
  expandedCategoryIds,
  onExpandedCategoryIdsChange,
  onCreateCategory,
  onAssignSong,
  onRemoveAssignment,
  onSaveOrder,
}: CategoryTreeEditorProps) {
  const [categories, setCategories] = useState<AdminCategory[]>(snapshot.categories);
  const [links, setLinks] = useState<LocalLink[]>(linksFromSnapshot(snapshot));
  const [selectedId, setSelectedId] = useState<number | null>(snapshot.categories[0]?.id ?? null);
  const [newName, setNewName] = useState("");
  const [selectedSongId, setSelectedSongId] = useState<number | "">("");
  const [selectedCategorySongId, setSelectedCategorySongId] = useState<number | null>(null);
  const [songSearchQuery, setSongSearchQuery] = useState("");
  const [targetCategoryId, setTargetCategoryId] = useState<number | "">("");
  const [targetCategorySearchQuery, setTargetCategorySearchQuery] = useState("");
  const [assigningSong, setAssigningSong] = useState(false);
  const [saving, setSaving] = useState(false);

  const songs = useMemo<LocalSong[]>(
    () =>
      snapshot.songs
        .map((song) => ({
          id: song.id,
          title: song.title,
          slug: song.slug,
          isPublished: song.isPublished,
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [snapshot.songs],
  );

  const tree = useMemo(() => buildTree(categories, links, songs), [categories, links, songs]);
  const unassignedSongs = songs.filter((song) => !links.some((link) => link.songId === song.id));
  const selectedSong = songs.find((song) => song.id === selectedSongId) ?? null;
  const selectedSongLink = selectedCategorySongId
    ? links.find((link) => link.id === selectedCategorySongId) ?? null
    : null;
  const currentSongCategory = selectedSongLink
    ? categories.find((category) => category.id === selectedSongLink.categoryId) ?? null
    : null;
  const targetCategory = categories.find((category) => category.id === targetCategoryId) ?? null;
  const targetMatchesCurrent = Boolean(
    selectedSongLink && targetCategoryId && selectedSongLink.categoryId === targetCategoryId,
  );
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const songOptions = useMemo<SearchOption[]>(
    () => [
      ...songs.map((song) => {
        const link = links.find((item) => item.songId === song.id);
        const location = link ? `En ${categoryNameById.get(link.categoryId) ?? "carpeta"}` : "Sin carpeta";

        return {
          value: String(song.id),
          label: song.title,
          description: `${location} - ${song.isPublished ? "Publicada" : "Borrador"}`,
        };
      }),
    ],
    [categoryNameById, links, songs],
  );
  const targetCategoryOptions = useMemo<SearchOption[]>(
    () => flattenCategoryOptions(tree),
    [tree],
  );

  function selectSongForMove(songId: number, categorySongId: number | null) {
    setSelectedSongId(songId);
    setSelectedCategorySongId(categorySongId);
    setSongSearchQuery(songs.find((song) => song.id === songId)?.title ?? "");
  }

  function selectSongFromDropdown(value: string) {
    if (!value) {
      setSelectedSongId("");
      setSelectedCategorySongId(null);
      setSongSearchQuery("");
      return;
    }

    const songId = Number(value);
    const firstLink = links.find((link) => link.songId === songId);
    selectSongForMove(songId, firstLink?.id ?? null);
  }

  async function assignSelectedSong() {
    if (!selectedSongId || !targetCategoryId || targetMatchesCurrent) {
      return;
    }

    setAssigningSong(true);

    try {
      await onAssignSong(
        Number(selectedSongId),
        Number(targetCategoryId),
        selectedCategorySongId ?? undefined,
      );
    } finally {
      setAssigningSong(false);
    }
  }

  function toggleCategory(categoryId: number) {
    const next = new Set(expandedCategoryIds);

    if (next.has(categoryId)) {
      next.delete(categoryId);
    } else {
      next.add(categoryId);
    }

    onExpandedCategoryIdsChange(next);
  }

  function moveCategory(categoryId: number, direction: -1 | 1) {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) {
      return;
    }

    const siblings = categories
      .filter((item) => item.parentId === category.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const index = siblings.findIndex((item) => item.id === categoryId);
    const swapWith = siblings[index + direction];

    if (!swapWith) {
      return;
    }

    setCategories((current) =>
      current.map((item) => {
        if (item.id === category.id) {
          return { ...item, sortOrder: swapWith.sortOrder };
        }
        if (item.id === swapWith.id) {
          return { ...item, sortOrder: category.sortOrder };
        }
        return item;
      }),
    );
  }

  function moveLink(linkId: number, direction: -1 | 1) {
    const link = links.find((item) => item.id === linkId);
    if (!link) {
      return;
    }

    const siblings = links
      .filter((item) => item.categoryId === link.categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const index = siblings.findIndex((item) => item.id === linkId);
    const swapWith = siblings[index + direction];

    if (!swapWith) {
      return;
    }

    setLinks((current) =>
      current.map((item) => {
        if (item.id === link.id) {
          return { ...item, sortOrder: swapWith.sortOrder };
        }
        if (item.id === swapWith.id) {
          return { ...item, sortOrder: link.sortOrder };
        }
        return item;
      }),
    );
  }

  function handleDrop(targetCategoryId: number, encoded: string) {
    const payload = parseDragPayload(encoded);

    if (!payload) {
      return;
    }

    if (payload.type === "category") {
      if (payload.id === targetCategoryId || isDescendant(categories, targetCategoryId, payload.id)) {
        return;
      }

      const nextSortOrder =
        Math.max(-1, ...categories.filter((category) => category.parentId === targetCategoryId).map((category) => category.sortOrder)) + 1;

      setCategories((current) =>
        current.map((category) =>
          category.id === payload.id
            ? { ...category, parentId: targetCategoryId, sortOrder: nextSortOrder }
            : category,
        ),
      );
      return;
    }

    if (payload.type === "category-song") {
      void onAssignSong(payload.songId, targetCategoryId, payload.categorySongId);
      return;
    }

    if (payload.type === "song") {
      void onAssignSong(payload.songId, targetCategoryId);
    }
  }

  async function saveOrder() {
    setSaving(true);
    await onSaveOrder({
      categories: categories.map((category) => ({
        id: category.id,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
      })),
      categorySongs: links.map((link) => ({
        id: link.id,
        categoryId: link.categoryId,
        sortOrder: link.sortOrder,
      })),
    });
    setSaving(false);
  }

  return (
    <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="min-w-0 rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-stone-200 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
            <p className="mt-1 text-sm text-stone-600">
              En escritorio puedes arrastrar. En movil, toca una carpeta o cancion y usa los controles laterales.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={() => onExpandedCategoryIdsChange(new Set())}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Minus aria-hidden="true" size={15} />
              Contraer todo
            </button>
            <button
              type="button"
              onClick={() =>
                onExpandedCategoryIdsChange(new Set(categories.map((category) => category.id)))
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Plus aria-hidden="true" size={15} />
              Expandir todo
            </button>
            <button
              type="button"
              onClick={saveOrder}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-stone-900 px-3 text-sm font-semibold text-white hover:bg-stone-700 disabled:bg-stone-400"
            >
              <Save aria-hidden="true" size={16} />
              {saving ? "Guardando..." : "Guardar orden"}
            </button>
          </div>
        </div>

        <div className="grid min-w-0 gap-1 p-2 sm:p-3">
          {tree.length > 0 ? (
            tree.map((node) => (
              <EditableCategoryNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onDropPayload={handleDrop}
                onMoveCategory={moveCategory}
                onMoveLink={moveLink}
                onSelectSongForMove={selectSongForMove}
                selectedCategorySongId={selectedCategorySongId}
                expandedCategoryIds={expandedCategoryIds}
                onToggleCategory={toggleCategory}
                onRemoveAssignment={onRemoveAssignment}
              />
            ))
          ) : (
            <p className="rounded-md bg-stone-50 px-3 py-8 text-center text-sm text-stone-500">Aun no hay categorias.</p>
          )}
        </div>
      </div>

      <aside className="grid min-w-0 content-start gap-4 lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-stone-950">Crear carpeta</h3>
          <div className="mt-3 grid gap-2">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="h-10 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Nombre"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!newName.trim()}
                onClick={async () => {
                  await onCreateCategory(newName, null);
                  setNewName("");
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-40"
              >
                <FolderPlus aria-hidden="true" size={16} />
                Raiz
              </button>
              <button
                type="button"
                disabled={!newName.trim() || !selectedId}
                onClick={async () => {
                  await onCreateCategory(newName, selectedId);
                  setNewName("");
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-40"
              >
                <Plus aria-hidden="true" size={16} />
                Subgrupo
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-stone-950">Mover canciones</h3>
          <p className="mt-1 text-sm text-stone-600">
            Selecciona una cancion y la carpeta donde debe quedar asignada.
          </p>
          <div className="mt-3 grid gap-3">
            <SearchablePicker
              label="Cancion"
              value={selectedSongId ? String(selectedSongId) : ""}
              query={songSearchQuery}
              options={songOptions}
              placeholder="Buscar por titulo"
              emptyMessage="No hay canciones que coincidan."
              onQueryChange={setSongSearchQuery}
              onChange={selectSongFromDropdown}
            />
            <SearchablePicker
              label="Carpeta destino"
              value={targetCategoryId ? String(targetCategoryId) : ""}
              query={targetCategorySearchQuery}
              options={targetCategoryOptions}
              placeholder="Buscar carpeta"
              emptyMessage="No hay carpetas que coincidan."
              onQueryChange={setTargetCategorySearchQuery}
              onChange={(value) => setTargetCategoryId(value ? Number(value) : "")}
            />

            {selectedSong ? (
              <div className="rounded-md bg-stone-50 p-3 text-sm">
                <p className="font-semibold text-stone-900">{selectedSong.title}</p>
                <p className="mt-1 text-stone-600">
                  {currentSongCategory
                    ? `Asignacion actual: ${currentSongCategory.name}`
                    : "Actualmente sin carpeta"}
                </p>
                {targetCategory ? (
                  <p className={targetMatchesCurrent ? "mt-1 text-amber-700" : "mt-1 text-emerald-700"}>
                    {targetMatchesCurrent
                      ? "Selecciona una carpeta diferente para moverla."
                      : `Nueva asignacion: ${targetCategory.name}`}
                  </p>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              disabled={!selectedSongId || !targetCategoryId || targetMatchesCurrent || assigningSong}
              onClick={assignSelectedSong}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-400"
            >
              <Music aria-hidden="true" size={16} />
              {assigningSong
                ? "Guardando..."
                : selectedCategorySongId
                  ? "Mover al grupo"
                  : "Asignar al grupo"}
            </button>
          </div>

          {unassignedSongs.length > 0 ? (
            <div className="mt-4 grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Sin carpeta</p>
              {unassignedSongs.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  draggable
                  onClick={() => selectSongForMove(song.id, null)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", JSON.stringify({ type: "song", songId: song.id }));
                  }}
                  className={`flex min-h-10 min-w-0 items-center gap-2 rounded-md border px-2 text-left text-sm text-stone-700 hover:bg-stone-50 ${
                    selectedSongId === song.id && selectedCategorySongId === null
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-stone-200"
                  }`}
                >
                  <GripVertical aria-hidden="true" size={14} className="hidden shrink-0 text-stone-400 sm:block" />
                  <span className="min-w-0 truncate">{song.title}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </aside>
    </section>
  );
}

function EditableCategoryNode({
  node,
  depth,
  selectedId,
  onSelect,
  onDropPayload,
  onMoveCategory,
  onMoveLink,
  onSelectSongForMove,
  selectedCategorySongId,
  expandedCategoryIds,
  onToggleCategory,
  onRemoveAssignment,
}: {
  node: TreeNode;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDropPayload: (targetCategoryId: number, encoded: string) => void;
  onMoveCategory: (id: number, direction: -1 | 1) => void;
  onMoveLink: (id: number, direction: -1 | 1) => void;
  onSelectSongForMove: (songId: number, categorySongId: number) => void;
  selectedCategorySongId: number | null;
  expandedCategoryIds: Set<number>;
  onToggleCategory: (id: number) => void;
  onRemoveAssignment: (id: number) => Promise<void>;
}) {
  const expanded = expandedCategoryIds.has(node.id);
  const hasContents = node.songs.length > 0 || node.children.length > 0;
  const contentsId = `category-contents-${node.id}`;

  return (
    <div className="min-w-0">
      <div
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", JSON.stringify({ type: "category", id: node.id }));
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onDropPayload(node.id, event.dataTransfer.getData("text/plain"));
        }}
        className={`category-tree-row flex min-h-11 min-w-0 items-center gap-2 rounded-md px-2 transition ${
          selectedId === node.id ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-stone-50"
        }`}
        style={{ "--depth": depth } as TreeDepthStyle}
      >
        <GripVertical aria-hidden="true" size={15} className="hidden shrink-0 text-stone-400 sm:block" />
        <button
          type="button"
          onClick={() => onToggleCategory(node.id)}
          disabled={!hasContents}
          aria-expanded={hasContents ? expanded : undefined}
          aria-controls={hasContents ? contentsId : undefined}
          className="grid size-8 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-white disabled:cursor-default disabled:opacity-30"
          aria-label={expanded ? `Contraer ${node.name}` : `Expandir ${node.name}`}
        >
          {expanded ? (
            <ChevronDown aria-hidden="true" size={17} />
          ) : (
            <ChevronRight aria-hidden="true" size={17} />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Folder aria-hidden="true" size={17} className="shrink-0 text-amber-600" />
          <span className="truncate text-sm font-semibold text-stone-900">{node.name}</span>
        </button>
        <button
          type="button"
          onClick={() => onMoveCategory(node.id, -1)}
          className="grid size-8 shrink-0 place-items-center rounded-md border border-stone-300 text-stone-600 hover:bg-white"
          aria-label="Subir categoria"
        >
          <ArrowUp aria-hidden="true" size={14} />
        </button>
        <button
          type="button"
          onClick={() => onMoveCategory(node.id, 1)}
          className="grid size-8 shrink-0 place-items-center rounded-md border border-stone-300 text-stone-600 hover:bg-white"
          aria-label="Bajar categoria"
        >
          <ArrowDown aria-hidden="true" size={14} />
        </button>
      </div>

      {expanded && hasContents ? (
        <div id={contentsId}>
          {node.songs.map((song) => (
            <div
              key={song.linkId}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  "text/plain",
                  JSON.stringify({ type: "category-song", categorySongId: song.linkId, songId: song.id }),
                );
              }}
              className={`category-song-row flex min-h-10 min-w-0 items-center gap-2 rounded-md px-2 text-sm text-stone-700 hover:bg-stone-50 ${
                selectedCategorySongId === song.linkId ? "bg-emerald-50 ring-1 ring-emerald-200" : ""
              }`}
              style={{ "--depth": depth } as TreeDepthStyle}
            >
              <GripVertical aria-hidden="true" size={14} className="hidden shrink-0 text-stone-400 sm:block" />
              <Music aria-hidden="true" size={15} className="shrink-0 text-emerald-700" />
              <button
                type="button"
                onClick={() => onSelectSongForMove(song.id, song.linkId)}
                className="min-w-0 flex-1 truncate text-left"
              >
                {song.title}
              </button>
              <button
                type="button"
                onClick={() => onMoveLink(song.linkId, -1)}
                className="grid size-8 shrink-0 place-items-center rounded-md border border-stone-300 text-stone-600 hover:bg-white"
                aria-label="Subir cancion"
              >
                <ArrowUp aria-hidden="true" size={14} />
              </button>
              <button
                type="button"
                onClick={() => onMoveLink(song.linkId, 1)}
                className="grid size-8 shrink-0 place-items-center rounded-md border border-stone-300 text-stone-600 hover:bg-white"
                aria-label="Bajar cancion"
              >
                <ArrowDown aria-hidden="true" size={14} />
              </button>
              <button
                type="button"
                onClick={() => onRemoveAssignment(song.linkId)}
                className="grid size-8 shrink-0 place-items-center rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50"
                aria-label="Quitar del grupo"
              >
                <Trash2 aria-hidden="true" size={14} />
              </button>
            </div>
          ))}

          {node.children.map((child) => (
            <EditableCategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onDropPayload={onDropPayload}
              onMoveCategory={onMoveCategory}
              onMoveLink={onMoveLink}
              onSelectSongForMove={onSelectSongForMove}
              selectedCategorySongId={selectedCategorySongId}
              expandedCategoryIds={expandedCategoryIds}
              onToggleCategory={onToggleCategory}
              onRemoveAssignment={onRemoveAssignment}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function linksFromSnapshot(snapshot: AdminSnapshot): LocalLink[] {
  return snapshot.songs.flatMap((song) =>
    song.categories.map((link) => ({
      id: link.id,
      categoryId: link.categoryId,
      songId: song.id,
      sortOrder: link.sortOrder,
    })),
  );
}

function buildTree(categories: AdminCategory[], links: LocalLink[], songs: LocalSong[]) {
  const songMap = new Map(songs.map((song) => [song.id, song]));
  const map = new Map<number, TreeNode>();

  categories.forEach((category) => {
    map.set(category.id, { ...category, children: [], songs: [] });
  });

  links.forEach((link) => {
    const category = map.get(link.categoryId);
    const song = songMap.get(link.songId);

    if (category && song) {
      category.songs.push({ ...song, linkId: link.id, sortOrder: link.sortOrder });
    }
  });

  const roots: TreeNode[] = [];

  map.forEach((category) => {
    const parent = category.parentId ? map.get(category.parentId) : null;
    if (parent) {
      parent.children.push(category);
    } else {
      roots.push(category);
    }
  });

  function sort(node: TreeNode) {
    node.children.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    node.songs.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    node.children.forEach(sort);
  }

  roots.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  roots.forEach(sort);
  return roots;
}

function flattenCategoryOptions(tree: TreeNode[]) {
  const options: SearchOption[] = [];

  function append(nodes: TreeNode[], path: string[]) {
    nodes.forEach((node) => {
      const nextPath = [...path, node.name];
      options.push({
        value: String(node.id),
        label: node.name,
        description: nextPath.join(" / "),
      });
      append(node.children, nextPath);
    });
  }

  append(tree, []);
  return options;
}

function SearchablePicker({
  label,
  value,
  query,
  options,
  placeholder,
  emptyMessage,
  onQueryChange,
  onChange,
}: {
  label: string;
  value: string;
  query: string;
  options: SearchOption[];
  placeholder: string;
  emptyMessage: string;
  onQueryChange: (query: string) => void;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const normalizedQuery = normalizeSearchValue(query);
  const matchingOptions = useMemo(() => {
    if (!normalizedQuery) {
      return options.slice(0, 12);
    }

    return options
      .filter((option) =>
        normalizeSearchValue(`${option.label} ${option.description ?? ""}`).includes(normalizedQuery),
      )
      .sort((a, b) => {
        const aLabel = normalizeSearchValue(a.label);
        const bLabel = normalizeSearchValue(b.label);
        const startsDifference =
          Number(bLabel.startsWith(normalizedQuery)) - Number(aLabel.startsWith(normalizedQuery));

        return startsDifference || a.label.localeCompare(b.label, "es");
      })
      .slice(0, 12);
  }, [normalizedQuery, options]);

  useEffect(() => {
    function closeFromOutside(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", closeFromOutside);
    window.addEventListener("keydown", closeFromEscape);

    return () => {
      window.removeEventListener("pointerdown", closeFromOutside);
      window.removeEventListener("keydown", closeFromEscape);
    };
  }, []);

  function choose(option: SearchOption) {
    onQueryChange(option.label);
    onChange(option.value);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative grid min-w-0 gap-2">
      <label htmlFor={id} className="text-sm font-medium text-stone-800">
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          id={id}
          type="text"
          value={query}
          onChange={(event) => {
            onChange("");
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-results`}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          className="h-11 w-full rounded-md border border-stone-300 bg-white pl-10 pr-10 text-sm text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onQueryChange("");
              setOpen(true);
            }}
            className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            aria-label={`Limpiar ${label.toLowerCase()}`}
          >
            <X aria-hidden="true" size={16} />
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id={`${id}-results`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-72 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-xl"
        >
          {matchingOptions.length > 0 ? (
            matchingOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => choose(option)}
                className={`flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition ${
                  option.value === value
                    ? "bg-emerald-50 text-emerald-950"
                    : "text-stone-800 hover:bg-stone-50"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-normal font-semibold leading-snug">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block whitespace-normal text-xs leading-snug text-stone-500">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {option.value === value ? (
                  <Check aria-hidden="true" size={16} className="shrink-0 text-emerald-700" />
                ) : null}
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-stone-500">{emptyMessage}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDragPayload(value: string):
  | { type: "category"; id: number }
  | { type: "category-song"; categorySongId: number; songId: number }
  | { type: "song"; songId: number }
  | null {
  try {
    const parsed = JSON.parse(value) as { type?: string; id?: number; categorySongId?: number; songId?: number };
    if (parsed.type === "category" && typeof parsed.id === "number") {
      return { type: "category", id: parsed.id };
    }
    if (
      parsed.type === "category-song" &&
      typeof parsed.categorySongId === "number" &&
      typeof parsed.songId === "number"
    ) {
      return { type: "category-song", categorySongId: parsed.categorySongId, songId: parsed.songId };
    }
    if (parsed.type === "song" && typeof parsed.songId === "number") {
      return { type: "song", songId: parsed.songId };
    }
  } catch {
    return null;
  }

  return null;
}

function isDescendant(categories: AdminCategory[], candidateId: number, parentId: number) {
  let current = categories.find((category) => category.id === candidateId);
  const seen = new Set<number>();

  while (current && !seen.has(current.id)) {
    if (current.parentId === parentId) {
      return true;
    }
    seen.add(current.id);
    current = current.parentId ? categories.find((category) => category.id === current?.parentId) : undefined;
  }

  return false;
}
