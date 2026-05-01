"use client";

import { useMemo, useState, useTransition } from "react";
import { Menu, Search, X } from "lucide-react";
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

      <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
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

        <SongViewer song={selectedSong} loading={isPending} />
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
