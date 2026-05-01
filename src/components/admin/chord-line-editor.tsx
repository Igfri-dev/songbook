"use client";

import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import type { SongLineData } from "@/lib/song-content";

type ChordLineEditorProps = {
  line: SongLineData;
  onChange: (line: SongLineData) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export function ChordLineEditor({
  line,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  canMoveUp,
  canMoveDown,
}: ChordLineEditorProps) {
  function updateChord(index: number, patch: Partial<SongLineData["chords"][number]>) {
    onChange({
      ...line,
      chords: line.chords.map((chord, chordIndex) =>
        chordIndex === index ? { ...chord, ...patch } : chord,
      ),
    });
  }

  function removeChord(index: number) {
    onChange({ ...line, chords: line.chords.filter((_, chordIndex) => chordIndex !== index) });
  }

  function addChord() {
    onChange({
      ...line,
      chords: [...line.chords, { chord: "MI", at: Math.min(line.lyrics.length, 12) }],
    });
  }

  return (
    <div className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Letra</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="grid size-8 place-items-center rounded-md border border-stone-300 text-stone-600 disabled:opacity-35"
              aria-label="Subir linea"
            >
              <ArrowLeft aria-hidden="true" size={15} className="rotate-90" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="grid size-8 place-items-center rounded-md border border-stone-300 text-stone-600 disabled:opacity-35"
              aria-label="Bajar linea"
            >
              <ArrowRight aria-hidden="true" size={15} className="rotate-90" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="grid size-8 place-items-center rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50"
              aria-label="Eliminar linea"
            >
              <Trash2 aria-hidden="true" size={15} />
            </button>
          </div>
        </div>
        <input
          value={line.lyrics}
          onChange={(event) => onChange({ ...line, lyrics: event.target.value })}
          className="h-10 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="Letra de la linea"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Acordes</label>
          <button
            type="button"
            onClick={addChord}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            <Plus aria-hidden="true" size={14} />
            Acorde
          </button>
        </div>

        {line.chords.length === 0 ? (
          <p className="rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-500">Sin acordes en esta linea.</p>
        ) : (
          <div className="grid gap-2">
            {line.chords.map((chord, index) => (
              <div
                key={`${index}-${chord.chord}`}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_4.5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_auto]"
              >
                <input
                  value={chord.chord}
                  onChange={(event) => updateChord(index, { chord: event.target.value })}
                  className="h-9 min-w-0 rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-emerald-600"
                  aria-label="Acorde"
                />
                <input
                  value={chord.at}
                  type="number"
                  min={0}
                  max={240}
                  onChange={(event) => updateChord(index, { at: Number(event.target.value) })}
                  className="h-9 min-w-0 rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-emerald-600"
                  aria-label="Posicion"
                />
                <div className="col-span-2 grid grid-cols-3 gap-1 sm:col-span-1 sm:flex sm:items-center">
                  <button
                    type="button"
                    onClick={() => updateChord(index, { at: Math.max(0, chord.at - 1) })}
                    className="grid h-9 place-items-center rounded-md border border-stone-300 text-stone-600 hover:bg-stone-50 sm:size-9"
                    aria-label="Mover acorde a la izquierda"
                  >
                    <ArrowLeft aria-hidden="true" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateChord(index, { at: chord.at + 1 })}
                    className="grid h-9 place-items-center rounded-md border border-stone-300 text-stone-600 hover:bg-stone-50 sm:size-9"
                    aria-label="Mover acorde a la derecha"
                  >
                    <ArrowRight aria-hidden="true" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeChord(index)}
                    className="grid h-9 place-items-center rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 sm:size-9"
                    aria-label="Eliminar acorde"
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
