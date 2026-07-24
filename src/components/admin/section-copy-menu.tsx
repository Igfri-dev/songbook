"use client";

import { ChevronDown, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type SectionCopyMode = "lyrics-and-chords" | "chords" | "lyrics";

type SectionCopyMenuProps = {
  canCopyChords: boolean;
  onChoose: (mode: SectionCopyMode) => void;
};

const copyActions: Array<{ mode: SectionCopyMode; label: string }> = [
  { mode: "lyrics-and-chords", label: "Letra y acordes" },
  { mode: "chords", label: "Acordes" },
  { mode: "lyrics", label: "Letra" },
];

export function SectionCopyMenu({ canCopyChords, onChoose }: SectionCopyMenuProps) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("down");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updatePlacement = useCallback(() => {
    const button = buttonRef.current;
    const root = rootRef.current;

    if (!button || !root) {
      return;
    }

    const buttonRect = button.getBoundingClientRect();
    let topBoundary = 0;
    let bottomBoundary = window.innerHeight;

    for (let element = root.parentElement; element; element = element.parentElement) {
      const overflowY = window.getComputedStyle(element).overflowY;

      if (overflowY === "auto" || overflowY === "scroll" || overflowY === "hidden") {
        const containerRect = element.getBoundingClientRect();
        topBoundary = Math.max(topBoundary, containerRect.top);
        bottomBoundary = Math.min(bottomBoundary, containerRect.bottom);
        break;
      }
    }

    const spaceBelow = bottomBoundary - buttonRect.bottom - 8;
    const spaceAbove = buttonRect.top - topBoundary - 8;
    setDirection(spaceBelow < 148 && spaceAbove > spaceBelow ? "up" : "down");
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeFromOutside(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", closeFromOutside);
    window.addEventListener("keydown", closeFromEscape);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    updatePlacement();

    return () => {
      window.removeEventListener("pointerdown", closeFromOutside);
      window.removeEventListener("keydown", closeFromEscape);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open, updatePlacement]);

  return (
    <div ref={rootRef} className="relative min-w-0 sm:shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!open) {
            updatePlacement();
          }
          setOpen((value) => !value);
        }}
        className="flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:w-auto"
      >
        <Copy aria-hidden="true" size={16} />
        Copiar de
        <ChevronDown
          aria-hidden="true"
          size={16}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Elegir contenido para copiar"
          className={`absolute right-0 z-50 grid w-full min-w-56 gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-xl sm:w-56 ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {copyActions.map((action) => (
            <button
              key={action.mode}
              type="button"
              role="menuitem"
              disabled={action.mode === "chords" && !canCopyChords}
              title={
                action.mode === "chords" && !canCopyChords
                  ? "No hay estrofas anteriores con acordes"
                  : undefined
              }
              onClick={() => {
                onChoose(action.mode);
                setOpen(false);
              }}
              className="flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm font-semibold text-stone-800 transition hover:bg-stone-50 focus:bg-emerald-50 focus:outline-none disabled:cursor-not-allowed disabled:text-stone-400 disabled:hover:bg-white"
            >
              Copiar {action.label.toLocaleLowerCase("es")}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
