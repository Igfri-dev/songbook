import {
  findFirstSongInTree,
  getPublishedCatalogTree,
  getPublishedSongBySlug,
} from "@/lib/catalog";
import { PublicSongbook } from "@/components/public-songbook";

export default async function Home() {
  const tree = await getPublishedCatalogTree();
  const firstSong = findFirstSongInTree(tree);
  const initialSong = firstSong ? await getPublishedSongBySlug(firstSong.slug) : null;

  return <PublicSongbook tree={tree} initialSong={initialSong} />;
}
