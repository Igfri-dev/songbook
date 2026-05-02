import "dotenv/config";
import fs from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { getDatabaseConfig } from "../src/lib/db-env";
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

const adapter = new PrismaMariaDb(getDatabaseConfig());
const prisma = new PrismaClient({ adapter });

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

  await prisma.$transaction(async (tx) => {
    await tx.categorySong.deleteMany();
    await tx.songContent.deleteMany();
    await tx.song.deleteMany();
    await tx.songCategory.deleteMany();
    await tx.catalogVersion.deleteMany();

    const categoryMap = new Map<string, number>();
    const categories = [...new Set(raw.map((song) => song.categoria?.trim() || "Entrada"))];

    for (const [index, name] of categories.entries()) {
      const category = await tx.songCategory.create({
        data: {
          name,
          slug: uniqueSlug(name, usedCategorySlugs),
          sortOrder: index,
        },
      });
      categoryMap.set(name, category.id);
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

      const song = await tx.song.create({
        data: {
          title: item.titulo.trim(),
          slug: uniqueSlug(item.titulo, usedSongSlugs),
          hasChords: Boolean(item.tiene_acordes),
          isPublished: true,
          contentVersion: now,
          content: {
            create: {
              contentJson: parseSongContent(item.letra ?? ""),
            },
          },
        },
      });

      await tx.categorySong.create({
        data: {
          categoryId,
          songId: song.id,
          sortOrder: item.numero ?? index,
        },
      });
    }

    await tx.catalogVersion.create({
      data: {
        mainVersion: now,
        publishedAt: now,
        notes: `Importado desde Entrada.json (${raw.length} canciones)`,
      },
    });
  });

  const [categories, songs, contents, links, versions] = await Promise.all([
    prisma.songCategory.count(),
    prisma.song.count(),
    prisma.songContent.count(),
    prisma.categorySong.count(),
    prisma.catalogVersion.count(),
  ]);

  console.log(JSON.stringify({ categories, songs, contents, links, versions }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
