"use client";

import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type CustomSelectProps = {
  label?: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

type MenuPlacement = {
  direction: "up" | "down";
  maxHeight: number;
};

export function CustomSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Seleccionar",
  disabled = false,
  className = "",
}: CustomSelectProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<MenuPlacement>({ direction: "down", maxHeight: 320 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  const updatePlacement = useCallback(() => {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const direction = spaceBelow < 260 && spaceAbove > spaceBelow ? "up" : "down";
    const available = direction === "up" ? spaceAbove : spaceBelow;

    setPlacement({
      direction,
      maxHeight: Math.max(180, Math.min(360, available)),
    });
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

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative grid gap-2 ${className}`}>
      {label ? (
        <label id={`${id}-label`} className="text-sm font-medium text-stone-800">
          {label}
        </label>
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${id}-label ${id}-button` : `${id}-button`}
        id={`${id}-button`}
        disabled={disabled}
        onClick={() => {
          if (!open) {
            updatePlacement();
          }
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-stone-300 bg-white px-3 text-left text-base text-stone-950 shadow-sm outline-none transition hover:border-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
      >
        <span className="min-w-0">
          <span className={`block truncate font-medium ${selectedOption ? "text-stone-950" : "text-stone-500"}`}>
            {selectedOption?.label ?? placeholder}
          </span>
          {selectedOption?.description ? (
            <span className="block truncate text-sm text-stone-500">{selectedOption.description}</span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={18}
          className={`shrink-0 text-stone-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-labelledby={label ? `${id}-label` : `${id}-button`}
          style={{ maxHeight: placement.maxHeight }}
          className={`absolute left-0 right-0 z-50 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-xl ${
            placement.direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(option.value)}
                className={`flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-base transition ${
                  selected ? "bg-emerald-50 text-emerald-950" : "text-stone-800 hover:bg-stone-50"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-normal font-semibold leading-snug">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block whitespace-normal text-sm leading-snug text-stone-500">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {selected ? <Check aria-hidden="true" size={17} className="shrink-0 text-emerald-700" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
