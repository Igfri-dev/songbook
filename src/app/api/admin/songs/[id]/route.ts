import { z } from "zod";
import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { db, transaction } from "@/lib/db";
import { makeUniqueSlug } from "@/lib/slug";
import { songPayloadSchema } from "@/lib/song-content";

export const dynamic = "force-dynamic";

const idSchema = z.coerce.number().int().positive();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
  } catch {
    return unauthorizedResponse();
  }

  const id = idSchema.parse((await params).id);
  const parsed = songPayloadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const existing = await db.queryOne<{ id: number }>(
    "SELECT id FROM songs WHERE id = ? LIMIT 1",
    [id],
  );

  if (!existing) {
    return Response.json({ error: "Cancion no encontrada" }, { status: 404 });
  }

  const slug = await makeUniqueSlug(parsed.data.title, async (candidate) => {
    const sameSlug = await db.queryOne<{ id: number }>(
      "SELECT id FROM songs WHERE slug = ? AND id <> ? LIMIT 1",
      [candidate, id],
    );
    return Boolean(sameSlug);
  });

  await transaction(async (tx) => {
    await tx.execute(
      `UPDATE songs
          SET title = ?, slug = ?, hasChords = ?, isPublished = ?, contentVersion = ?
        WHERE id = ?`,
      [parsed.data.title, slug, parsed.data.hasChords, parsed.data.isPublished, new Date(), id],
    );
    await tx.execute(
      `INSERT INTO song_contents (songId, contentJson)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE contentJson = VALUES(contentJson), updatedAt = CURRENT_TIMESTAMP(3)`,
      [id, JSON.stringify(parsed.data.content)],
    );
  });

  return Response.json(await getAdminSnapshot());
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
  } catch {
    return unauthorizedResponse();
  }

  const id = idSchema.parse((await params).id);
  await db.execute("DELETE FROM songs WHERE id = ?", [id]).catch(() => null);

  return Response.json(await getAdminSnapshot());
}
