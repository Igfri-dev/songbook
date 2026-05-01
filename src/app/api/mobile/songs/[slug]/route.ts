import { getPublishedSongBySlug } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const song = await getPublishedSongBySlug(decodeURIComponent(slug));

  if (!song) {
    return Response.json({ error: "Cancion no encontrada" }, { status: 404 });
  }

  return Response.json(song);
}
