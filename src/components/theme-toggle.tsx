"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

const storageKey = "cancionero-theme";

export function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(() =>
    typeof document === "undefined" ? false : document.documentElement.classList.contains("dark"),
  );

  function toggleTheme() {
    const nextDarkMode = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDarkMode);
    localStorage.setItem(storageKey, nextDarkMode ? "dark" : "light");
    setDarkMode(nextDarkMode);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid size-10 place-items-center rounded-md border border-stone-300 text-stone-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
      aria-label={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
      title={darkMode ? "Modo claro" : "Modo oscuro"}
      suppressHydrationWarning
    >
      {darkMode ? <Sun aria-hidden="true" size={17} /> : <Moon aria-hidden="true" size={17} />}
    </button>
  );
}
