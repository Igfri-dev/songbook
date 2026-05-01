import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { makeUniqueSlug } from "@/lib/slug";
import { songPayloadSchema } from "@/lib/song-content";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdminSession();
  } catch {
    return unauthorizedResponse();
  }

  const parsed = songPayloadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const now = new Date();
  const slug = await makeUniqueSlug(parsed.data.title, async (candidate) => {
    const existing = await prisma.song.findUnique({ where: { slug: candidate } });
    return Boolean(existing);
  });

  await prisma.$transaction(async (tx) => {
    const song = await tx.song.create({
      data: {
        title: parsed.data.title,
        slug,
        hasChords: parsed.data.hasChords,
        isPublished: parsed.data.isPublished,
        contentVersion: now,
        content: {
          create: { contentJson: parsed.data.content },
        },
      },
    });

    if (parsed.data.categoryId) {
      const last = await tx.categorySong.findFirst({
        where: { categoryId: parsed.data.categoryId },
        orderBy: { sortOrder: "desc" },
      });

      await tx.categorySong.create({
        data: {
          songId: song.id,
          categoryId: parsed.data.categoryId,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });
    }
  });

  return Response.json(await getAdminSnapshot(), { status: 201 });
}
