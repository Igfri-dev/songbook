"use client";

import { useMemo, useState, useTransition } from "react";
import { Menu, Minus, Music, Plus, RotateCcw, Search, Type, X } from "lucide-react";
import type { CatalogCategoryNode, CatalogSongNode, PublicSongPayload } from "@/lib/catalog";
import { CatalogTree } from "@/components/catalog-tree";
import { SongViewer } from "@/components/song-viewer";

type PublicSongbookProps = {
  tree: CatalogCategoryNode[];
  initialSong: PublicSongPayload | null;
};

export function PublicSongbook({ tree, initialSong }: PublicSongbookProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState<PublicSongPayload | null>(initialSong);
  const [fontScale, setFontScale] = useState(1);
  const [transpose, setTranspose] = useState(0);
  const [isPending, startTransition] = useTransition();

  const songs = useMemo(() => flattenSongs(tree), [tree]);
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return [];
    }
    return songs.filter((song) => song.title.toLowerCase().includes(term));
  }, [query, songs]);

  function selectSong(slug: string) {
    setDrawerOpen(false);
    startTransition(async () => {
      const response = await fetch(`/api/mobile/songs/${encodeURIComponent(slug)}`);
      if (!response.ok) {
        return;
      }
      const song = (await response.json()) as PublicSongPayload;
      setSelectedSong(song);
    });
  }

  function changeFontScale(delta: number) {
    setFontScale((value) => clamp(Number((value + delta).toFixed(2)), 0.85, 1.45));
  }

  function changeTranspose(delta: number) {
    setTranspose((value) => clamp(value + delta, -11, 11));
  }

  const songControls = (
    <SongControls
      fontScale={fontScale}
      transpose={transpose}
      onFontScaleChange={changeFontScale}
      onTransposeChange={changeTranspose}
      onReset={() => {
        setFontScale(1);
        setTranspose(0);
      }}
    />
  );

  const sidebar = (
    <aside className="flex h-full flex-col bg-white">
      <div className="border-b border-stone-200 p-4">
        <label className="relative block">
          <Search aria-hidden="true" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar canciones"
            className="h-11 w-full rounded-md border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {query.trim() ? (
          <div className="grid gap-1">
            {results.length > 0 ? (
              results.map((song) => (
                <button
                  key={song.slug}
                  type="button"
                  onClick={() => selectSong(song.slug)}
                  className="min-h-10 rounded-md px-3 text-left text-sm text-stone-700 transition hover:bg-stone-100"
                >
                  {song.title}
                </button>
              ))
            ) : (
              <p className="px-3 py-5 text-sm text-stone-500">Sin resultados.</p>
            )}
          </div>
        ) : (
          <CatalogTree nodes={tree} selectedSlug={selectedSong?.slug} onSelectSong={selectSong} />
        )}
      </div>
    </aside>
  );

  return (
    <main className="flex flex-1 bg-stone-50">
      <div className="hidden w-[360px] shrink-0 border-r border-stone-200 lg:block">{sidebar}</div>

      <div className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-5">
        <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm"
          >
            <Menu aria-hidden="true" size={17} />
            Catalogo
          </button>
        </div>

        <div className="mb-4 hidden justify-end lg:flex">{songControls}</div>

        <SongViewer song={selectedSong} loading={isPending} fontScale={fontScale} transpose={transpose} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-3 py-2 shadow-[0_-10px_24px_rgb(28_25_23/0.10)] backdrop-blur lg:hidden">
        {songControls}
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar catalogo"
            className="absolute inset-0 bg-stone-950/35"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(88vw,360px)] border-r border-stone-200 bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-stone-200 px-4">
              <p className="font-semibold text-stone-950">Catalogo</p>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setDrawerOpen(false)}
                className="grid size-9 place-items-center rounded-md text-stone-600 hover:bg-stone-100"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SongControls({
  fontScale,
  transpose,
  onFontScaleChange,
  onTransposeChange,
  onReset,
}: {
  fontScale: number;
  transpose: number;
  onFontScaleChange: (delta: number) => void;
  onTransposeChange: (delta: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 rounded-lg border border-stone-200 bg-white p-2 shadow-sm sm:w-auto sm:grid-cols-[auto_auto_auto]">
      <div className="flex min-w-0 items-center rounded-md border border-stone-200">
        <span className="grid size-10 shrink-0 place-items-center text-stone-500">
          <Type aria-hidden="true" size={17} />
        </span>
        <button
          type="button"
          onClick={() => onFontScaleChange(-0.1)}
          className="grid size-10 place-items-center text-stone-700 hover:bg-stone-50 disabled:opacity-35"
          disabled={fontScale <= 0.85}
          aria-label="Disminuir tamano de letra"
        >
          <Minus aria-hidden="true" size={16} />
        </button>
        <span className="w-10 text-center text-sm font-semibold tabular-nums text-stone-800">
          {Math.round(fontScale * 100)}
        </span>
        <button
          type="button"
          onClick={() => onFontScaleChange(0.1)}
          className="grid size-10 place-items-center text-stone-700 hover:bg-stone-50 disabled:opacity-35"
          disabled={fontScale >= 1.45}
          aria-label="Aumentar tamano de letra"
        >
          <Plus aria-hidden="true" size={16} />
        </button>
      </div>

      <div className="flex min-w-0 items-center rounded-md border border-stone-200">
        <span className="grid size-10 shrink-0 place-items-center text-stone-500">
          <Music aria-hidden="true" size={17} />
        </span>
        <button
          type="button"
          onClick={() => onTransposeChange(-1)}
          className="grid size-10 place-items-center text-stone-700 hover:bg-stone-50 disabled:opacity-35"
          disabled={transpose <= -11}
          aria-label="Bajar tonalidad"
        >
          <Minus aria-hidden="true" size={16} />
        </button>
        <span className="w-10 text-center text-sm font-semibold tabular-nums text-stone-800">
          {transpose > 0 ? `+${transpose}` : transpose}
        </span>
        <button
          type="button"
          onClick={() => onTransposeChange(1)}
          className="grid size-10 place-items-center text-stone-700 hover:bg-stone-50 disabled:opacity-35"
          disabled={transpose >= 11}
          aria-label="Subir tonalidad"
        >
          <Plus aria-hidden="true" size={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="grid size-10 place-items-center rounded-md border border-stone-200 text-stone-700 hover:bg-stone-50"
        aria-label="Restablecer letra y tonalidad"
      >
        <RotateCcw aria-hidden="true" size={16} />
      </button>
    </div>
  );
}

function flattenSongs(tree: CatalogCategoryNode[]) {
  const songs: CatalogSongNode[] = [];

  function walk(nodes: CatalogCategoryNode[]) {
    for (const node of nodes) {
      songs.push(...node.songs);
      walk(node.children);
    }
  }

  walk(tree);
  return songs;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
