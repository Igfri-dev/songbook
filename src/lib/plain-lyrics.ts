import {
  type SongContentData,
  type SongLineData,
  emptySongContent,
} from "@/lib/song-content";

const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function contentFromPlainLyrics(value: string): SongContentData {
  const sections: SongContentData["sections"] = [];
  let lines: SongLineData[] = [];

  function flushSection() {
    if (lines.length === 0) {
      return;
    }

    sections.push({
      type: "verse",
      title: `Estrofa ${sections.length + 1}`,
      lines,
    });
    lines = [];
  }

  for (const rawLine of value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    const lyrics = rawLine.replace(controlCharacters, "").trimEnd();

    if (!lyrics.trim()) {
      flushSection();
      continue;
    }

    lines.push({ lyrics, chords: [] });
  }

  flushSection();

  return sections.length > 0 ? { sections } : cloneSongContent(emptySongContent);
}

function cloneSongContent(content: SongContentData) {
  return JSON.parse(JSON.stringify(content)) as SongContentData;
}
