"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex size-10 items-center justify-center gap-2 rounded-md border border-stone-300 text-sm font-medium text-stone-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 sm:h-auto sm:w-auto sm:px-3 sm:py-2"
      aria-label="Cerrar sesion"
      title="Cerrar sesion"
    >
      <LogOut aria-hidden="true" size={16} />
      <span className="hidden sm:inline">Salir</span>
    </button>
  );
}
