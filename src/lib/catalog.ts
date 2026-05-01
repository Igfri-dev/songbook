import { prisma } from "@/lib/prisma";
import {
  type SongContentData,
  emptySongContent,
  normalizeSongContent,
} from "@/lib/song-content";

type CategoryRecord = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
};

type SongLinkRecord = {
  id: number;
  categoryId: number;
  songId: number;
  sortOrder: number;
  song: {
    id: number;
    title: string;
    slug: string;
    hasChords: boolean;
    isPublished?: boolean;
    contentVersion: Date;
  };
};

export type CatalogSongNode = {
  id: number;
  title: string;
  slug: string;
  hasChords: boolean;
  contentVersion: string;
  categorySongId?: number;
  sortOrder?: number;
  isPublished?: boolean;
};

export type CatalogCategoryNode = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
  children: CatalogCategoryNode[];
  songs: CatalogSongNode[];
};

export type PublicSongPayload = {
  slug: string;
  title: string;
  hasChords: boolean;
  contentVersion: string;
  content: SongContentData;
};

export type AdminCategory = CategoryRecord & {
  createdAt: string;
  updatedAt: string;
};

export type AdminSong = {
  id: number;
  title: string;
  slug: string;
  hasChords: boolean;
  isPublished: boolean;
  contentVersion: string;
  createdAt: string;
  updatedAt: string;
  content: SongContentData;
  categories: {
    id: number;
    categoryId: number;
    sortOrder: number;
  }[];
};

export type AdminSnapshot = {
  categories: AdminCategory[];
  songs: AdminSong[];
  latestVersion: string | null;
  versions: {
    id: number;
    mainVersion: string;
    publishedAt: string;
    notes: string | null;
  }[];
};

function iso(value: Date) {
  return value.toISOString();
}

function songNodeFromLink(link: SongLinkRecord): CatalogSongNode {
  return {
    id: link.song.id,
    title: link.song.title,
    slug: link.song.slug,
    hasChords: link.song.hasChords,
    isPublished: link.song.isPublished,
    contentVersion: iso(link.song.contentVersion),
    categorySongId: link.id,
    sortOrder: link.sortOrder,
  };
}

export function buildCatalogTree(
  categories: CategoryRecord[],
  links: SongLinkRecord[],
  includeEmpty = true,
) {
  const byId = new Map<number, CatalogCategoryNode>();

  for (const category of categories) {
    byId.set(category.id, {
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      children: [],
      songs: [],
    });
  }

  for (const link of links) {
    const category = byId.get(link.categoryId);
    if (category) {
      category.songs.push(songNodeFromLink(link));
    }
  }

  const roots: CatalogCategoryNode[] = [];

  for (const category of byId.values()) {
    const parent = category.parentId ? byId.get(category.parentId) : null;
    if (parent) {
      parent.children.push(category);
    } else {
      roots.push(category);
    }
  }

  const sortNode = (node: CatalogCategoryNode) => {
    node.children.sort(sortByOrderThenName);
    node.songs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title));
    node.children.forEach(sortNode);
  };

  roots.sort(sortByOrderThenName);
  roots.forEach(sortNode);

  return includeEmpty ? roots : roots.map(pruneEmpty).filter(Boolean) as CatalogCategoryNode[];
}

function sortByOrderThenName(a: CatalogCategoryNode, b: CatalogCategoryNode) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

function pruneEmpty(node: CatalogCategoryNode): CatalogCategoryNode | null {
  const children = node.children.map(pruneEmpty).filter(Boolean) as CatalogCategoryNode[];
  const next = { ...node, children };
  return next.songs.length > 0 || next.children.length > 0 ? next : null;
}

export async function getLatestMainVersion() {
  const version = await prisma.catalogVersion.findFirst({
    orderBy: [{ mainVersion: "desc" }, { id: "desc" }],
  });

  return version?.mainVersion ?? null;
}

export async function getPublishedCatalogTree() {
  const [categories, links] = await Promise.all([
    prisma.songCategory.findMany({
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.categorySong.findMany({
      where: {
        song: { isPublished: true },
      },
      include: {
        song: true,
      },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  return buildCatalogTree(categories, links, false);
}

export async function getPublishedSongBySlug(slug: string): Promise<PublicSongPayload | null> {
  const song = await prisma.song.findFirst({
    where: { slug, isPublished: true },
    include: { content: true },
  });

  if (!song) {
    return null;
  }

  return {
    slug: song.slug,
    title: song.title,
    hasChords: song.hasChords,
    contentVersion: iso(song.contentVersion),
    content: normalizeSongContent(song.content?.contentJson ?? emptySongContent),
  };
}

export function findFirstSongInTree(tree: CatalogCategoryNode[]): CatalogSongNode | null {
  for (const category of tree) {
    if (category.songs[0]) {
      return category.songs[0];
    }

    const childSong = findFirstSongInTree(category.children);
    if (childSong) {
      return childSong;
    }
  }

  return null;
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  const [categories, songs, versions] = await Promise.all([
    prisma.songCategory.findMany({
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.song.findMany({
      include: {
        content: true,
        categories: {
          orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
        },
      },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    }),
    prisma.catalogVersion.findMany({
      orderBy: [{ mainVersion: "desc" }, { id: "desc" }],
      take: 8,
    }),
  ]);

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      createdAt: iso(category.createdAt),
      updatedAt: iso(category.updatedAt),
    })),
    songs: songs.map((song) => ({
      id: song.id,
      title: song.title,
      slug: song.slug,
      hasChords: song.hasChords,
      isPublished: song.isPublished,
      contentVersion: iso(song.contentVersion),
      createdAt: iso(song.createdAt),
      updatedAt: iso(song.updatedAt),
      content: normalizeSongContent(song.content?.contentJson ?? emptySongContent),
      categories: song.categories.map((link) => ({
        id: link.id,
        categoryId: link.categoryId,
        sortOrder: link.sortOrder,
      })),
    })),
    latestVersion: versions[0]?.mainVersion.toISOString() ?? null,
    versions: versions.map((version) => ({
      id: version.id,
      mainVersion: iso(version.mainVersion),
      publishedAt: iso(version.publishedAt),
      notes: version.notes,
    })),
  };
}

export async function getMobileManifest() {
  const [mainVersion, categories, songs] = await Promise.all([
    getLatestMainVersion(),
    prisma.songCategory.findMany(),
    prisma.song.findMany({
      where: { isPublished: true },
      include: {
        categories: {
          include: { category: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
      orderBy: [{ title: "asc" }],
    }),
  ]);

  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  function pathFor(categoryId: number | null): string[] {
    const path: string[] = [];
    let current = categoryId ? categoryMap.get(categoryId) : null;
    const seen = new Set<number>();

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      path.unshift(current.name);
      current = current.parentId ? categoryMap.get(current.parentId) : null;
    }

    return path;
  }

  return {
    mainVersion: (mainVersion ?? new Date(0)).toISOString(),
    generatedAt: new Date().toISOString(),
    songs: songs.map((song) => {
      const firstCategory = song.categories[0]?.categoryId ?? null;
      return {
        slug: song.slug,
        title: song.title,
        categoryPath: pathFor(firstCategory),
        contentVersion: iso(song.contentVersion),
      };
    }),
  };
}

export async function getMobileIndex() {
  const [mainVersion, tree] = await Promise.all([
    getLatestMainVersion(),
    getPublishedCatalogTree(),
  ]);

  return {
    mainVersion: (mainVersion ?? new Date(0)).toISOString(),
    tree,
  };
}
