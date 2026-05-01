import { Music2 } from "lucide-react";
import type { PublicSongPayload } from "@/lib/catalog";
import { StructuredSongRenderer } from "@/components/structured-song-renderer";

export function SongViewer({ song, loading }: { song: PublicSongPayload | null; loading?: boolean }) {
  if (!song) {
    return (
      <section className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
        <div>
          <Music2 aria-hidden="true" className="mx-auto mb-3 text-stone-400" size={32} />
          <h1 className="text-xl font-semibold text-stone-900">No hay canciones publicadas</h1>
          <p className="mt-2 text-sm text-stone-600">Publica una cancion desde el panel admin para verla aqui.</p>
        </div>
      </section>
    );
  }

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <p className="text-sm font-medium text-emerald-700">{song.hasChords ? "Con acordes" : "Letra"}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-stone-950">{song.title}</h1>
        </div>
        <p className="rounded-md bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600">
          v{new Date(song.contentVersion).toLocaleDateString("es-CL")}
        </p>
      </header>

      {loading ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Cargando...</p> : null}

      <StructuredSongRenderer content={song.content} />
    </article>
  );
}
