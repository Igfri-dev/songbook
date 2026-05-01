import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
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

  await prisma.$transaction(async (tx) => {
    const last = await tx.categorySong.findFirst({
      where: { categoryId: parsed.data.categoryId },
      orderBy: { sortOrder: "desc" },
    });
    const sortOrder = (last?.sortOrder ?? -1) + 1;

    if (parsed.data.categorySongId) {
      const current = await tx.categorySong.findUnique({
        where: { id: parsed.data.categorySongId },
      });

      if (!current) {
        return;
      }

      const duplicate = await tx.categorySong.findUnique({
        where: {
          categoryId_songId: {
            categoryId: parsed.data.categoryId,
            songId: current.songId,
          },
        },
      });

      if (duplicate && duplicate.id !== current.id) {
        await tx.categorySong.delete({ where: { id: current.id } });
        await tx.categorySong.update({
          where: { id: duplicate.id },
          data: { sortOrder },
        });
      } else {
        await tx.categorySong.update({
          where: { id: current.id },
          data: { categoryId: parsed.data.categoryId, sortOrder },
        });
      }

      return;
    }

    await tx.categorySong.upsert({
      where: {
        categoryId_songId: {
          categoryId: parsed.data.categoryId,
          songId: parsed.data.songId,
        },
      },
      update: { sortOrder },
      create: {
        categoryId: parsed.data.categoryId,
        songId: parsed.data.songId,
        sortOrder,
      },
    });
  });

  return Response.json(await getAdminSnapshot());
}
