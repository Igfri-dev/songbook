"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
    >
      <LogOut aria-hidden="true" size={16} />
      Salir
    </button>
  );
}
