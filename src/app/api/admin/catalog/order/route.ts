import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { transaction } from "@/lib/db";
import { orderPayloadSchema } from "@/lib/song-content";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    await requireAdminSession();
  } catch {
    return unauthorizedResponse();
  }

  const parsed = orderPayloadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success || parsed.data.categories.some((category) => category.id === category.parentId)) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  await transaction(async (tx) => {
    for (const category of parsed.data.categories) {
      await tx.execute(
        "UPDATE song_categories SET parentId = ?, sortOrder = ? WHERE id = ?",
        [category.parentId, category.sortOrder, category.id],
      );
    }

    for (const link of parsed.data.categorySongs) {
      await tx.execute(
        "UPDATE category_songs SET categoryId = ?, sortOrder = ? WHERE id = ?",
        [link.categoryId, link.sortOrder, link.id],
      );
    }
  });

  return Response.json(await getAdminSnapshot());
}
