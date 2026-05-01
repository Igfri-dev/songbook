import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
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

  await prisma.$transaction([
    ...parsed.data.categories.map((category) =>
      prisma.songCategory.update({
        where: { id: category.id },
        data: {
          parentId: category.parentId,
          sortOrder: category.sortOrder,
        },
      }),
    ),
    ...parsed.data.categorySongs.map((link) =>
      prisma.categorySong.update({
        where: { id: link.id },
        data: {
          categoryId: link.categoryId,
          sortOrder: link.sortOrder,
        },
      }),
    ),
  ]);

  return Response.json(await getAdminSnapshot());
}
