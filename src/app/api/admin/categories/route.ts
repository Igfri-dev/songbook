import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { db } from "@/lib/db";
import { makeUniqueSlug } from "@/lib/slug";
import { categoryPayloadSchema } from "@/lib/song-content";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdminSession();
  } catch {
    return unauthorizedResponse();
  }

  const parsed = categoryPayloadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const parentId = parsed.data.parentId ?? null;
  const slug = await makeUniqueSlug(parsed.data.name, async (candidate) => {
    const existing = await db.queryOne<{ id: number }>(
      "SELECT id FROM song_categories WHERE slug = ? LIMIT 1",
      [candidate],
    );
    return Boolean(existing);
  });
  const last = await db.queryOne<{ sortOrder: number }>(
    "SELECT sortOrder FROM song_categories WHERE parentId <=> ? ORDER BY sortOrder DESC LIMIT 1",
    [parentId],
  );

  await db.execute(
    "INSERT INTO song_categories (name, slug, parentId, sortOrder) VALUES (?, ?, ?, ?)",
    [parsed.data.name, slug, parentId, (last?.sortOrder ?? -1) + 1],
  );

  return Response.json(await getAdminSnapshot(), { status: 201 });
}
