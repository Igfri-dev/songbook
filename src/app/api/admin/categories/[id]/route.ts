import { z } from "zod";
import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
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
    const existing = await prisma.songCategory.findFirst({
      where: { slug: candidate, id: { not: id } },
    });
    return Boolean(existing);
  });

  await prisma.songCategory.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug,
      parentId: parsed.data.parentId ?? null,
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
  await prisma.songCategory.delete({ where: { id } }).catch(() => null);

  return Response.json(await getAdminSnapshot());
}
