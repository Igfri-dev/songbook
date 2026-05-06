import "dotenv/config";
import fs from "node:fs";
import { closeDbPool, insertedId, transaction, db } from "../src/lib/db";
import { slugify } from "../src/lib/slug";

type RawSong = {
  numero?: number;
  titulo: string;
  letra: string;
  categoria?: string;
  tiene_acordes?: boolean;
};

type Chord = { chord: string; at: number };
type SongLine = { lyrics: string; chords: Chord[] };
type SongContent = {
  sections: { type: "verse"; title: string; lines: SongLine[] }[];
};

const inputPath = process.argv[2] ?? "/Users/hans/Downloads/Entrada.json";
const raw = JSON.parse(fs.readFileSync(inputPath, "utf8")) as RawSong[];

if (!Array.isArray(raw)) {
  throw new Error("Entrada.json debe ser un arreglo de canciones");
}

function parseChordLine(line: string) {
  const chords: Chord[] = [];
  const pattern = /\[([^\]]*)\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line))) {
    const inner = match[1] ?? "";
    for (const token of inner.matchAll(/\S+/g)) {
      chords.push({
        chord: token[0].trim(),
        at: Math.min(240, match.index + (token.index ?? 0)),
      });
    }
  }

  const lyrics = line.replace(pattern, "").replace(/[ \t]+$/g, "");
  return { lyrics, chords };
}

function hasVisibleLine(lines: SongLine[]) {
  return lines.some((line) => line.lyrics.trim() || line.chords.length > 0);
}

function sortChords(chords: Chord[]) {
  return chords
    .filter((chord) => chord.chord)
    .map((chord) => ({
      chord: chord.chord,
      at: Math.max(0, Math.min(240, chord.at)),
    }))
    .sort((a, b) => a.at - b.at || a.chord.localeCompare(b.chord));
}

function parseSongContent(letra: string): SongContent {
  const sections: SongContent["sections"] = [];
  let current: SongLine[] = [];
  let pendingChords: Chord[] = [];

  function pushPendingAsInstrumental() {
    if (pendingChords.length) {
      current.push({ lyrics: "", chords: sortChords(pendingChords) });
      pendingChords = [];
    }
  }

  function flushSection() {
    if (!hasVisibleLine(current)) {
      current = [];
      return;
    }

    sections.push({
      type: "verse",
      title: `Estrofa ${sections.length + 1}`,
      lines: current,
    });
    current = [];
  }

  for (const rawLine of letra.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

    if (!line.trim()) {
      pushPendingAsInstrumental();
      flushSection();
      continue;
    }

    const parsed = parseChordLine(line);

    if (!parsed.lyrics.trim() && parsed.chords.length) {
      pendingChords = [...pendingChords, ...parsed.chords];
      continue;
    }

    current.push({
      lyrics: parsed.lyrics.trimEnd(),
      chords: sortChords([...pendingChords, ...parsed.chords]),
    });
    pendingChords = [];
  }

  pushPendingAsInstrumental();
  flushSection();

  if (!sections.length) {
    return {
      sections: [{ type: "verse", title: "Estrofa 1", lines: [{ lyrics: "", chords: [] }] }],
    };
  }

  return { sections };
}

function uniqueSlug(title: string, used: Set<string>) {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  used.add(candidate);
  return candidate;
}

async function main() {
  const now = new Date();
  const usedSongSlugs = new Set<string>();
  const usedCategorySlugs = new Set<string>();

  await transaction(async (tx) => {
    await tx.execute("DELETE FROM category_songs");
    await tx.execute("DELETE FROM song_contents");
    await tx.execute("DELETE FROM songs");
    await tx.execute("DELETE FROM song_categories");
    await tx.execute("DELETE FROM catalog_versions");

    const categoryMap = new Map<string, number>();
    const categories = [...new Set(raw.map((song) => song.categoria?.trim() || "Entrada"))];

    for (const [index, name] of categories.entries()) {
      const category = await tx.execute(
        "INSERT INTO song_categories (name, slug, sortOrder) VALUES (?, ?, ?)",
        [name, uniqueSlug(name, usedCategorySlugs), index],
      );
      categoryMap.set(name, insertedId(category));
    }

    for (const [index, item] of raw.entries()) {
      if (!item.titulo?.trim()) {
        throw new Error(`Cancion sin titulo en indice ${index}`);
      }

      const categoryName = item.categoria?.trim() || "Entrada";
      const categoryId = categoryMap.get(categoryName);

      if (!categoryId) {
        throw new Error(`Categoria no encontrada: ${categoryName}`);
      }

      const song = await tx.execute(
        `INSERT INTO songs (title, slug, hasChords, isPublished, contentVersion)
         VALUES (?, ?, ?, TRUE, ?)`,
        [item.titulo.trim(), uniqueSlug(item.titulo, usedSongSlugs), Boolean(item.tiene_acordes), now],
      );
      const songId = insertedId(song);

      await tx.execute(
        "INSERT INTO song_contents (songId, contentJson) VALUES (?, ?)",
        [songId, JSON.stringify(parseSongContent(item.letra ?? ""))],
      );

      await tx.execute(
        "INSERT INTO category_songs (categoryId, songId, sortOrder) VALUES (?, ?, ?)",
        [categoryId, songId, item.numero ?? index],
      );
    }

    await tx.execute(
      "INSERT INTO catalog_versions (mainVersion, publishedAt, notes) VALUES (?, ?, ?)",
      [now, now, `Importado desde Entrada.json (${raw.length} canciones)`],
    );
  });

  const [categories, songs, contents, links, versions] = await Promise.all([
    db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM song_categories"),
    db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM songs"),
    db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM song_contents"),
    db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM category_songs"),
    db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM catalog_versions"),
  ]);

  console.log(JSON.stringify({
    categories: Number(categories?.count ?? 0),
    songs: Number(songs?.count ?? 0),
    contents: Number(contents?.count ?? 0),
    links: Number(links?.count ?? 0),
    versions: Number(versions?.count ?? 0),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDbPool();
  });
