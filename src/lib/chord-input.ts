import type { ChordData, SongContentData } from "@/lib/song-content";

export type ChordNotation = "spanish" | "english";
type FormatChordInputOptions = {
  autocomplete?: boolean;
};

const spanishRoots = ["SOL", "DO", "RE", "MI", "FA", "LA", "SI"] as const;
const englishRoots = new Set(["A", "B", "C", "D", "E", "F", "G"]);
const spanishShortcuts: Record<string, (typeof spanishRoots)[number]> = {
  D: "DO",
  R: "RE",
  M: "MI",
  F: "FA",
  L: "LA",
  S: "SOL",
};

export function formatChordInput(
  value: string,
  notation: ChordNotation = "spanish",
  options: FormatChordInputOptions = {},
) {
  const compact = value.replace(/\s+/g, "").slice(0, 24);
  const shouldAutocomplete = options.autocomplete ?? true;

  if (!compact) {
    return "";
  }

  const explicitSpanishRoot = findSpanishRoot(compact);
  if (explicitSpanishRoot) {
    return explicitSpanishRoot + compact.slice(explicitSpanishRoot.length);
  }

  const firstLetter = compact[0]?.toUpperCase() ?? "";
  const rest = compact.slice(1);

  if (
    shouldAutocomplete &&
    notation === "spanish" &&
    compact.length === 1 &&
    spanishShortcuts[firstLetter]
  ) {
    return spanishShortcuts[firstLetter];
  }

  if (compact.length === 1 && englishRoots.has(firstLetter)) {
    return firstLetter;
  }

  if (shouldAutocomplete && !englishRoots.has(firstLetter) && spanishShortcuts[firstLetter]) {
    return spanishShortcuts[firstLetter] + rest;
  }

  return firstLetter + rest;
}

export function shouldAutocompleteChordInput(
  nativeEvent: Event,
  previousValue: string,
  nextValue: string,
) {
  const inputType =
    "inputType" in nativeEvent ? String((nativeEvent as InputEvent).inputType) : "";

  if (inputType.startsWith("delete")) {
    return false;
  }

  if (inputType.startsWith("insert")) {
    return true;
  }

  return compactLength(nextValue) > compactLength(previousValue);
}

export function chordInputKeyShortcut(
  currentValue: string,
  key: string,
  notation: ChordNotation = "spanish",
) {
  if (
    notation === "spanish" &&
    currentValue === "SOL" &&
    key.length === 1 &&
    key.toUpperCase() === "I"
  ) {
    return "SI";
  }

  return null;
}

export function inferContentChordNotation(
  content: SongContentData,
  sectionIndex?: number,
  lineIndex?: number,
): ChordNotation {
  const lineChords =
    typeof sectionIndex === "number" && typeof lineIndex === "number"
      ? content.sections[sectionIndex]?.lines[lineIndex]?.chords ?? []
      : [];

  if (lineChords.length > 0) {
    return inferChordNotation(lineChords);
  }

  return inferChordNotation(
    content.sections.flatMap((section) => section.lines.flatMap((line) => line.chords)),
  );
}

export function inferChordNotation(chords: readonly Pick<ChordData, "chord">[]): ChordNotation {
  let spanishCount = 0;
  let englishCount = 0;

  for (const item of chords) {
    const core = chordCore(item.chord);

    if (findSpanishRoot(core)) {
      spanishCount += 1;
      continue;
    }

    if (englishRoots.has(core[0]?.toUpperCase() ?? "")) {
      englishCount += 1;
    }
  }

  return englishCount > spanishCount ? "english" : "spanish";
}

function findSpanishRoot(value: string) {
  const upperValue = value.toUpperCase();

  return spanishRoots.find((root) => upperValue.startsWith(root)) ?? null;
}

function compactLength(value: string) {
  return value.replace(/\s+/g, "").length;
}

function chordCore(value: string) {
  return value.replace(/^[|[(\s]+/, "").replace(/[|)\],.;:\s]+$/, "");
}
