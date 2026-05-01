"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Folder, Music } from "lucide-react";
import type { CatalogCategoryNode } from "@/lib/catalog";

type CatalogTreeProps = {
  nodes: CatalogCategoryNode[];
  selectedSlug?: string | null;
  onSelectSong: (slug: string) => void;
};

export function CatalogTree({ nodes, selectedSlug, onSelectSong }: CatalogTreeProps) {
  const initialExpanded = useMemo(() => collectCategoryIds(nodes), [nodes]);
  const [expanded, setExpanded] = useState<Set<number>>(initialExpanded);

  function toggle(id: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="grid gap-1">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          expanded={expanded}
          selectedSlug={selectedSlug}
          onToggle={toggle}
          onSelectSong={onSelectSong}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  selectedSlug,
  onToggle,
  onSelectSong,
}: {
  node: CatalogCategoryNode;
  depth: number;
  expanded: Set<number>;
  selectedSlug?: string | null;
  onToggle: (id: number) => void;
  onSelectSong: (slug: string) => void;
}) {
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0 || node.songs.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(node.id)}
        className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
        style={{ paddingLeft: `${depth * 1 + 0.5}rem` }}
      >
        {hasChildren ? (
          isOpen ? <ChevronDown aria-hidden="true" size={16} /> : <ChevronRight aria-hidden="true" size={16} />
        ) : (
          <span className="w-4" />
        )}
        <Folder aria-hidden="true" size={16} className="text-amber-600" />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
      </button>

      {isOpen ? (
        <div className="grid gap-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedSlug={selectedSlug}
              onToggle={onToggle}
              onSelectSong={onSelectSong}
            />
          ))}

          {node.songs.map((song) => (
            <button
              key={`${node.id}-${song.slug}`}
              type="button"
              onClick={() => onSelectSong(song.slug)}
              className={`flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition ${
                selectedSlug === song.slug
                  ? "bg-emerald-50 font-semibold text-emerald-900 ring-1 ring-emerald-200"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
              style={{ paddingLeft: `${(depth + 1) * 1 + 0.75}rem` }}
            >
              <Music aria-hidden="true" size={15} className="text-emerald-700" />
              <span className="min-w-0 flex-1 truncate">{song.title}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function collectCategoryIds(nodes: CatalogCategoryNode[]) {
  const ids = new Set<number>();

  function walk(items: CatalogCategoryNode[]) {
    for (const item of items) {
      ids.add(item.id);
      walk(item.children);
    }
  }

  walk(nodes);
  return ids;
}
