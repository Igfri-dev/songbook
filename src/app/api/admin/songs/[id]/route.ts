import { z } from "zod";
import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
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

  const existing = await prisma.song.findUnique({ where: { id } });

  if (!existing) {
    return Response.json({ error: "Cancion no encontrada" }, { status: 404 });
  }

  const slug = await makeUniqueSlug(parsed.data.title, async (candidate) => {
    const sameSlug = await prisma.song.findFirst({
      where: { slug: candidate, id: { not: id } },
    });
    return Boolean(sameSlug);
  });

  await prisma.song.update({
    where: { id },
    data: {
      title: parsed.data.title,
      slug,
      hasChords: parsed.data.hasChords,
      isPublished: parsed.data.isPublished,
      contentVersion: new Date(),
      content: {
        upsert: {
          create: { contentJson: parsed.data.content },
          update: { contentJson: parsed.data.content },
        },
      },
    },
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
  await prisma.song.delete({ where: { id } }).catch(() => null);

  return Response.json(await getAdminSnapshot());
}
