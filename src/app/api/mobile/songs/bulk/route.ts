import { db } from "@/lib/db";
import { bulkSongsSchema, normalizeSongContent } from "@/lib/song-content";

export const dynamic = "force-dynamic";

function parseContent(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function POST(request: Request) {
  const parsed = bulkSongsSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  if (parsed.data.slugs.length === 0) {
    return Response.json({ songs: [] });
  }

  const placeholders = parsed.data.slugs.map(() => "?").join(", ");
  const songs = await db.query<{
    slug: string;
    title: string;
    hasChords: number | boolean;
    contentVersion: Date | string;
    contentJson: unknown;
  }>(
    `SELECT s.slug, s.title, s.hasChords, s.contentVersion, sc.contentJson
       FROM songs s
       LEFT JOIN song_contents sc ON sc.songId = s.id
      WHERE s.isPublished = TRUE AND s.slug IN (${placeholders})
      ORDER BY s.title ASC`,
    parsed.data.slugs,
  );

  return Response.json({
    songs: songs.map((song) => ({
      slug: song.slug,
      title: song.title,
      hasChords: Boolean(song.hasChords),
      contentVersion: (song.contentVersion instanceof Date ? song.contentVersion : new Date(song.contentVersion)).toISOString(),
      content: normalizeSongContent(parseContent(song.contentJson)),
    })),
  });
}
