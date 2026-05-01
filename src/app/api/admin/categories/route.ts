import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
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
    const existing = await prisma.songCategory.findUnique({ where: { slug: candidate } });
    return Boolean(existing);
  });
  const last = await prisma.songCategory.findFirst({
    where: { parentId },
    orderBy: { sortOrder: "desc" },
  });

  await prisma.songCategory.create({
    data: {
      name: parsed.data.name,
      slug,
      parentId,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  return Response.json(await getAdminSnapshot(), { status: 201 });
}
