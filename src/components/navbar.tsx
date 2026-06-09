import Link from "next/link";
import { LockKeyhole, Music2, Settings } from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

export async function Navbar() {
  const session = await getAuthSession();
  const canOpenPanel = Boolean(session?.user?.role);

  return (
    <header className="border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 w-full min-w-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex min-w-0 items-center gap-2 text-lg font-semibold text-stone-950">
          <span className="grid size-9 place-items-center rounded-md bg-emerald-700 text-white">
            <Music2 aria-hidden="true" size={19} />
          </span>
          <span className="truncate">Cancionero</span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {canOpenPanel ? (
            <>
              <Link
                href="/admin"
                aria-label="Abrir panel admin"
                title="Panel admin"
                className="inline-flex size-10 items-center justify-center gap-2 rounded-md bg-stone-900 text-sm font-medium text-white transition hover:bg-stone-700 sm:h-auto sm:w-auto sm:px-3 sm:py-2"
              >
                <Settings aria-hidden="true" size={16} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <LockKeyhole aria-hidden="true" size={16} />
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
