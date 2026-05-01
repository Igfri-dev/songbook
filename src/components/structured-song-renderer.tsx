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

export function StructuredSongRenderer({ content }: { content: SongContentData }) {
  return (
    <div className="grid gap-8">
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
                          {chord.chord}
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
