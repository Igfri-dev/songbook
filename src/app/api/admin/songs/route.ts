import { requirePanelSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { insertedId, db, transaction } from "@/lib/db";
import { makeUniqueSlug } from "@/lib/slug";
import { songPayloadSchema } from "@/lib/song-content";
import { normalizeSongTitle } from "@/lib/song-title";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requirePanelSession();
  } catch {
    return unauthorizedResponse();
  }

  const parsed = songPayloadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const normalizedTitle = normalizeSongTitle(parsed.data.title);
  const existingSongs = await db.query<{ id: number; title: string }>(
    "SELECT id, title FROM songs",
  );
  const duplicateSong = existingSongs.find(
    (song) => normalizeSongTitle(song.title) === normalizedTitle,
  );

  if (duplicateSong) {
    return Response.json(
      {
        error: `La cancion "${duplicateSong.title}" ya existe`,
        existingSongId: duplicateSong.id,
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const slug = await makeUniqueSlug(parsed.data.title, async (candidate) => {
    const existing = await db.queryOne<{ id: number }>(
      "SELECT id FROM songs WHERE slug = ? LIMIT 1",
      [candidate],
    );
    return Boolean(existing);
  });

  await transaction(async (tx) => {
    const song = await tx.execute(
      `INSERT INTO songs (title, slug, hasChords, isPublished, contentVersion)
       VALUES (?, ?, ?, ?, ?)`,
      [parsed.data.title, slug, parsed.data.hasChords, parsed.data.isPublished, now],
    );
    const songId = insertedId(song);

    await tx.execute(
      "INSERT INTO song_contents (songId, contentJson) VALUES (?, ?)",
      [songId, JSON.stringify(parsed.data.content)],
    );

    if (parsed.data.categoryId) {
      const last = await tx.queryOne<{ sortOrder: number }>(
        "SELECT sortOrder FROM category_songs WHERE categoryId = ? ORDER BY sortOrder DESC LIMIT 1",
        [parsed.data.categoryId],
      );

      await tx.execute(
        "INSERT INTO category_songs (songId, categoryId, sortOrder) VALUES (?, ?, ?)",
        [songId, parsed.data.categoryId, (last?.sortOrder ?? -1) + 1],
      );
    }
  });

  return Response.json(await getAdminSnapshot(), { status: 201 });
}
