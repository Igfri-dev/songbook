import {
  type SongContentData,
  type SongLineData,
  emptySongContent,
} from "@/lib/song-content";

const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const spanishRoots = ["DO", "RE", "MI", "FA", "SOL", "LA", "SI"] as const;
const englishRoots = ["A", "B", "C", "D", "E", "F", "G"] as const;
const chordSuffixPattern =
  "(?:[#b])?(?:(?:maj|min|dim|aug|sus|add|m|M)?(?:[0-9]{0,2})?)?(?:[#b]?[0-9]{0,2})?";
const slashChordPattern = `(?:/(?:${[...spanishRoots, ...englishRoots].join("|")})(?:[#b])?)?`;
const chordPattern = new RegExp(
  `^(?:${[...spanishRoots, ...englishRoots].join("|")})${chordSuffixPattern}${slashChordPattern}$`,
);
const repeatAnnotationPattern = /^[(\s]*(?:x\s*)?\d+\s*(?:veces?|x)?[)\s]*$/i;

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

  for (const rawSection of value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split(/\n\s*\n/g)) {
    const rawLines = rawSection
      .split("\n")
      .map((line) => line.replace(controlCharacters, "").trimEnd())
      .filter((line) => line.trim());

    if (rawLines.length === 0) {
      flushSection();
      continue;
    }

    for (let index = 0; index < rawLines.length; index += 1) {
      const currentLine = rawLines[index];
      const detected = detectChordLine(currentLine);
      const nextLine = rawLines[index + 1];

      if (!detected) {
        lines.push({ lyrics: currentLine, chords: [] });
        continue;
      }

      if (nextLine && !detectChordLine(nextLine)) {
        lines.push({
          lyrics: nextLine,
          chords: detected.chords,
        });
        index += 1;
        continue;
      }

      lines.push({
        lyrics: detected.annotation,
        chords: detected.chords,
      });
    }

    flushSection();
  }

  flushSection();

  return sections.length > 0 ? { sections } : cloneSongContent(emptySongContent);
}

function detectChordLine(line: string) {
  const chords: SongLineData["chords"] = [];
  const annotationParts: string[] = [];
  const tokens = line.matchAll(/\S+/g);

  for (const tokenMatch of tokens) {
    const token = tokenMatch[0];
    const parsed = parseChordToken(token);

    if (parsed) {
      chords.push({
        chord: parsed.chord,
        at: Math.min(240, tokenMatch.index + parsed.offset),
      });
      continue;
    }

    annotationParts.push(token);
  }

  if (chords.length === 0) {
    return null;
  }

  const annotation = annotationParts.join(" ");
  if (annotation && !repeatAnnotationPattern.test(annotation)) {
    return null;
  }

  return {
    chords,
    annotation,
  };
}

function parseChordToken(token: string) {
  const leading = token.match(/^[|[(]*/)?.[0] ?? "";
  const trailing = token.match(/[|)\],.;:]*$/)?.[0] ?? "";
  const core = token.slice(leading.length, token.length - trailing.length);

  if (!core || !chordPattern.test(core)) {
    return null;
  }

  const hasOpeningParenthesis = leading.includes("(");
  const hasClosingParenthesis = trailing.includes(")");

  return {
    chord: hasOpeningParenthesis && hasClosingParenthesis ? `(${core})` : core,
    offset: leading.includes("(") ? leading.indexOf("(") : leading.length,
  };
}

function cloneSongContent(content: SongContentData) {
  return JSON.parse(JSON.stringify(content)) as SongContentData;
}
