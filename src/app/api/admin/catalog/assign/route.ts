import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { transaction } from "@/lib/db";
import { assignSongSchema } from "@/lib/song-content";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdminSession();
  } catch {
    return unauthorizedResponse();
  }

  const parsed = assignSongSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  await transaction(async (tx) => {
    const last = await tx.queryOne<{ sortOrder: number }>(
      "SELECT sortOrder FROM category_songs WHERE categoryId = ? ORDER BY sortOrder DESC LIMIT 1",
      [parsed.data.categoryId],
    );
    const sortOrder = (last?.sortOrder ?? -1) + 1;

    if (parsed.data.categorySongId) {
      const current = await tx.queryOne<{ id: number; songId: number }>(
        "SELECT id, songId FROM category_songs WHERE id = ? LIMIT 1",
        [parsed.data.categorySongId],
      );

      if (!current) {
        return;
      }

      const duplicate = await tx.queryOne<{ id: number }>(
        "SELECT id FROM category_songs WHERE categoryId = ? AND songId = ? LIMIT 1",
        [parsed.data.categoryId, current.songId],
      );

      if (duplicate && duplicate.id !== current.id) {
        await tx.execute("DELETE FROM category_songs WHERE id = ?", [current.id]);
        await tx.execute("UPDATE category_songs SET sortOrder = ? WHERE id = ?", [sortOrder, duplicate.id]);
      } else {
        await tx.execute(
          "UPDATE category_songs SET categoryId = ?, sortOrder = ? WHERE id = ?",
          [parsed.data.categoryId, sortOrder, current.id],
        );
      }

      return;
    }

    await tx.execute(
      `INSERT INTO category_songs (categoryId, songId, sortOrder)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE sortOrder = VALUES(sortOrder)`,
      [parsed.data.categoryId, parsed.data.songId, sortOrder],
    );
  });

  return Response.json(await getAdminSnapshot());
}
