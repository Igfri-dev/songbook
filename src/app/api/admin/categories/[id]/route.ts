import { z } from "zod";
import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { db } from "@/lib/db";
import { makeUniqueSlug } from "@/lib/slug";
import { categoryPayloadSchema } from "@/lib/song-content";

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
  const parsed = categoryPayloadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success || parsed.data.parentId === id) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const slug = await makeUniqueSlug(parsed.data.name, async (candidate) => {
    const existing = await db.queryOne<{ id: number }>(
      "SELECT id FROM song_categories WHERE slug = ? AND id <> ? LIMIT 1",
      [candidate, id],
    );
    return Boolean(existing);
  });

  await db.execute(
    "UPDATE song_categories SET name = ?, slug = ?, parentId = ? WHERE id = ?",
    [parsed.data.name, slug, parsed.data.parentId ?? null, id],
  );

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
  await db.execute("DELETE FROM song_categories WHERE id = ?", [id]).catch(() => null);

  return Response.json(await getAdminSnapshot());
}
