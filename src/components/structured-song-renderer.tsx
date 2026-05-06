import type { CSSProperties } from "react";
import type { SongContentData } from "@/lib/song-content";

const sectionLabels: Record<string, string> = {
  intro: "Intro",
  verse: "Verso",
  chorus: "Estribillo",
  bridge: "Puente",
  outro: "Final",
};

type ChordStyle = CSSProperties & {
  "--at": number;
};

type SongRendererStyle = CSSProperties & {
  "--song-font-scale": number;
};

export function StructuredSongRenderer({
  content,
  fontScale = 1,
  transpose = 0,
}: {
  content: SongContentData;
  fontScale?: number;
  transpose?: number;
}) {
  return (
    <div
      className="song-renderer grid gap-8"
      style={{ "--song-font-scale": fontScale } as SongRendererStyle}
    >
      {content.sections.map((section, sectionIndex) => (
        <section key={`${section.type}-${sectionIndex}`} className="grid gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-stone-900">
              {section.title || sectionLabels[section.type] || "Seccion"}
            </h2>
            <span className="h-px flex-1 bg-stone-200" />
          </div>

          <div className="grid gap-1">
            {section.lines.map((line, lineIndex) => (
              <div key={`${sectionIndex}-${lineIndex}`} className="chord-line">
                {line.chords.length > 0 ? (
                  <div className="chord-layer" aria-hidden="true">
                    {[...line.chords]
                      .sort((a, b) => a.at - b.at)
                      .map((chord, chordIndex) => (
                        <span
                          key={`${chord.chord}-${chord.at}-${chordIndex}`}
                          className="chord-token"
                          style={{ "--at": Math.max(0, chord.at) } as ChordStyle}
                        >
                          {transposeChord(chord.chord, transpose)}
                        </span>
                      ))}
                  </div>
                ) : null}
                <span className="lyrics-line">{line.lyrics || "\u00a0"}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const chromaticSharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const chromaticFlat = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const spanishSharp = ["DO", "DO#", "RE", "RE#", "MI", "FA", "FA#", "SOL", "SOL#", "LA", "LA#", "SI"];
const spanishFlat = ["DO", "REb", "RE", "MIb", "MI", "FA", "SOLb", "SOL", "LAb", "LA", "SIb", "SI"];
const rootPattern = "DO(?:#|b)?|RE(?:#|b)?|MI(?:#|b)?|FA(?:#|b)?|SOL(?:#|b)?|LA(?:#|b)?|SI(?:#|b)?|[A-G](?:#|b)?";

const chordRoots: Record<string, number> = {
  C: 0,
  "C#": 1,
  DB: 1,
  D: 2,
  "D#": 3,
  EB: 3,
  E: 4,
  F: 5,
  "F#": 6,
  GB: 6,
  G: 7,
  "G#": 8,
  AB: 8,
  A: 9,
  "A#": 10,
  BB: 10,
  B: 11,
  DO: 0,
  "DO#": 1,
  REB: 1,
  RE: 2,
  "RE#": 3,
  MIB: 3,
  MI: 4,
  FA: 5,
  "FA#": 6,
  SOLB: 6,
  SOL: 7,
  "SOL#": 8,
  LAB: 8,
  LA: 9,
  "LA#": 10,
  SIB: 10,
  SI: 11,
};

function transposeChord(chord: string, semitones: number) {
  if (semitones === 0) {
    return chord;
  }

  return chord
    .replace(new RegExp(`^${rootPattern}`, "i"), (root) => transposeRoot(root, semitones))
    .replace(new RegExp(`/(${rootPattern})`, "gi"), (match, root: string) => {
      return `/${transposeRoot(root, semitones)}`;
    });
}

function transposeRoot(root: string, semitones: number) {
  const normalized = root.toUpperCase();
  const current = chordRoots[normalized];

  if (current === undefined) {
    return root;
  }

  const next = (current + semitones + 1200) % 12;
  const usesSpanish = /^DO|RE|MI|FA|SOL|LA|SI/i.test(root);
  const prefersFlat = /b/.test(root);
  const scale = usesSpanish
    ? prefersFlat ? spanishFlat : spanishSharp
    : prefersFlat ? chromaticFlat : chromaticSharp;

  return matchRootCase(scale[next], root);
}

function matchRootCase(nextRoot: string, originalRoot: string) {
  if (originalRoot === originalRoot.toLowerCase()) {
    return nextRoot.toLowerCase();
  }

  if (/^[A-G]$/.test(originalRoot)) {
    return nextRoot;
  }

  if (originalRoot === originalRoot.toUpperCase()) {
    return nextRoot.toUpperCase();
  }

  return nextRoot.charAt(0).toUpperCase() + nextRoot.slice(1).toLowerCase();
}
