import { db } from "@/lib/db";
import type { UserRole } from "@/lib/roles";
import {
  type SongContentData,
  emptySongContent,
  normalizeSongContent,
} from "@/lib/song-content";

type DateValue = Date | string;

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
    contentVersion: DateValue;
  };
};

type SongRow = {
  id: number;
  title: string;
  slug: string;
  hasChords: number | boolean;
  isPublished: number | boolean;
  contentVersion: DateValue;
  createdAt: DateValue;
  updatedAt: DateValue;
  contentJson: unknown;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  username: string;
  passwordHash: string | null;
  role: UserRole;
  createdAt: DateValue;
  updatedAt: DateValue;
};

type VersionRow = {
  id: number;
  mainVersion: DateValue;
  publishedAt: DateValue;
  notes: string | null;
};

type CategorySongRow = {
  id: number;
  categoryId: number;
  songId: number;
  sortOrder: number;
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

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminSnapshot = {
  currentUser?: {
    id: number;
    role: UserRole;
  };
  categories: AdminCategory[];
  songs: AdminSong[];
  users: AdminUser[];
  latestVersion: string | null;
  versions: {
    id: number;
    mainVersion: string;
    publishedAt: string;
    notes: string | null;
  }[];
};

function iso(value: DateValue) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function parseContentJson(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return emptySongContent;
  }
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
  const version = await db.queryOne<{ mainVersion: DateValue }>(
    "SELECT mainVersion FROM catalog_versions ORDER BY mainVersion DESC, id DESC LIMIT 1",
  );

  return version?.mainVersion ?? null;
}

export async function getPublishedCatalogTree() {
  const [categories, links] = await Promise.all([
    db.query<CategoryRecord>(
      "SELECT id, name, slug, parentId, sortOrder FROM song_categories ORDER BY parentId ASC, sortOrder ASC, name ASC",
    ),
    db.query<CategorySongRow & {
      songTitle: string;
      songSlug: string;
      songHasChords: number | boolean;
      songIsPublished: number | boolean;
      songContentVersion: DateValue;
    }>(
      `SELECT cs.id, cs.categoryId, cs.songId, cs.sortOrder,
              s.title AS songTitle, s.slug AS songSlug, s.hasChords AS songHasChords,
              s.isPublished AS songIsPublished, s.contentVersion AS songContentVersion
         FROM category_songs cs
         INNER JOIN songs s ON s.id = cs.songId
        WHERE s.isPublished = TRUE
        ORDER BY cs.categoryId ASC, cs.sortOrder ASC`,
    ).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        categoryId: row.categoryId,
        songId: row.songId,
        sortOrder: row.sortOrder,
        song: {
          id: row.songId,
          title: row.songTitle,
          slug: row.songSlug,
          hasChords: Boolean(row.songHasChords),
          isPublished: Boolean(row.songIsPublished),
          contentVersion: row.songContentVersion,
        },
      })),
    ),
  ]);

  return buildCatalogTree(categories, links, false);
}

export async function getPublishedSongBySlug(slug: string): Promise<PublicSongPayload | null> {
  const song = await db.queryOne<Pick<SongRow, "slug" | "title" | "hasChords" | "contentVersion" | "contentJson">>(
    `SELECT s.slug, s.title, s.hasChords, s.contentVersion, sc.contentJson
       FROM songs s
       LEFT JOIN song_contents sc ON sc.songId = s.id
      WHERE s.slug = ? AND s.isPublished = TRUE
      LIMIT 1`,
    [slug],
  );

  if (!song) {
    return null;
  }

  return {
    slug: song.slug,
    title: song.title,
    hasChords: Boolean(song.hasChords),
    contentVersion: iso(song.contentVersion),
    content: normalizeSongContent(parseContentJson(song.contentJson) ?? emptySongContent),
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
  const [categories, songs, links, users, versions] = await Promise.all([
    db.query<CategoryRecord & { createdAt: DateValue; updatedAt: DateValue }>(
      "SELECT id, name, slug, parentId, sortOrder, createdAt, updatedAt FROM song_categories ORDER BY parentId ASC, sortOrder ASC, name ASC",
    ),
    db.query<SongRow>(
      `SELECT s.id, s.title, s.slug, s.hasChords, s.isPublished, s.contentVersion,
              s.createdAt, s.updatedAt, sc.contentJson
         FROM songs s
         LEFT JOIN song_contents sc ON sc.songId = s.id
        ORDER BY s.updatedAt DESC, s.title ASC`,
    ),
    db.query<CategorySongRow>(
      "SELECT id, categoryId, songId, sortOrder FROM category_songs ORDER BY categoryId ASC, sortOrder ASC",
    ),
    db.query<UserRow>(
      "SELECT id, name, email, username, passwordHash, role, createdAt, updatedAt FROM users ORDER BY createdAt DESC, email ASC",
    ),
    db.query<VersionRow>(
      "SELECT id, mainVersion, publishedAt, notes FROM catalog_versions ORDER BY mainVersion DESC, id DESC LIMIT 8",
    ),
  ]);
  const linksBySong = new Map<number, CategorySongRow[]>();

  for (const link of links) {
    const existing = linksBySong.get(link.songId) ?? [];
    existing.push(link);
    linksBySong.set(link.songId, existing);
  }

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
      hasChords: Boolean(song.hasChords),
      isPublished: Boolean(song.isPublished),
      contentVersion: iso(song.contentVersion),
      createdAt: iso(song.createdAt),
      updatedAt: iso(song.updatedAt),
      content: normalizeSongContent(parseContentJson(song.contentJson) ?? emptySongContent),
      categories: (linksBySong.get(song.id) ?? []).map((link) => ({
        id: link.id,
        categoryId: link.categoryId,
        sortOrder: link.sortOrder,
      })),
    })),
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      hasPassword: Boolean(user.passwordHash),
      createdAt: iso(user.createdAt),
      updatedAt: iso(user.updatedAt),
    })),
    latestVersion: versions[0] ? iso(versions[0].mainVersion) : null,
    versions: versions.map((version) => ({
      id: version.id,
      mainVersion: iso(version.mainVersion),
      publishedAt: iso(version.publishedAt),
      notes: version.notes,
    })),
  };
}

export async function getMobileManifest() {
  const [mainVersion, categories, songs, links] = await Promise.all([
    getLatestMainVersion(),
    db.query<CategoryRecord>("SELECT id, name, slug, parentId, sortOrder FROM song_categories"),
    db.query<Pick<SongRow, "id" | "slug" | "title" | "contentVersion">>(
      "SELECT id, slug, title, contentVersion FROM songs WHERE isPublished = TRUE ORDER BY title ASC",
    ),
    db.query<CategorySongRow>(
      `SELECT cs.id, cs.categoryId, cs.songId, cs.sortOrder
         FROM category_songs cs
         INNER JOIN songs s ON s.id = cs.songId
        WHERE s.isPublished = TRUE
        ORDER BY cs.songId ASC, cs.sortOrder ASC, cs.id ASC`,
    ),
  ]);

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const firstCategoryBySong = new Map<number, number>();

  for (const link of links) {
    if (!firstCategoryBySong.has(link.songId)) {
      firstCategoryBySong.set(link.songId, link.categoryId);
    }
  }

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
    mainVersion: mainVersion ? iso(mainVersion) : new Date(0).toISOString(),
    generatedAt: new Date().toISOString(),
    songs: songs.map((song) => {
      const firstCategory = firstCategoryBySong.get(song.id) ?? null;
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
    mainVersion: mainVersion ? iso(mainVersion) : new Date(0).toISOString(),
    tree,
  };
}

export async function getUserManagementSnapshot(): Promise<AdminSnapshot> {
  const users = await db.query<UserRow>(
    "SELECT id, name, email, username, passwordHash, role, createdAt, updatedAt FROM users WHERE role = 'USER' ORDER BY createdAt DESC, email ASC",
  );

  return {
    categories: [],
    songs: [],
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      hasPassword: Boolean(user.passwordHash),
      createdAt: iso(user.createdAt),
      updatedAt: iso(user.updatedAt),
    })),
    latestVersion: null,
    versions: [],
  };
}
