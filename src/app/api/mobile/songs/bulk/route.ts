import { prisma } from "@/lib/prisma";
import { bulkSongsSchema, normalizeSongContent } from "@/lib/song-content";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = bulkSongsSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const songs = await prisma.song.findMany({
    where: {
      slug: { in: parsed.data.slugs },
      isPublished: true,
    },
    include: { content: true },
    orderBy: [{ title: "asc" }],
  });

  return Response.json({
    songs: songs.map((song) => ({
      slug: song.slug,
      title: song.title,
      hasChords: song.hasChords,
      contentVersion: song.contentVersion.toISOString(),
      content: normalizeSongContent(song.content?.contentJson),
    })),
  });
}
