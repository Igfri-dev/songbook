import Link from "next/link";
import { LockKeyhole, Music2, Settings } from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export async function Navbar() {
  const session = await getAuthSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex min-w-0 items-center gap-2 text-lg font-semibold text-stone-950">
          <span className="grid size-9 place-items-center rounded-md bg-emerald-700 text-white">
            <Music2 aria-hidden="true" size={19} />
          </span>
          <span className="truncate">Cancionero</span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2">
          {isAdmin ? (
            <>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
              >
                <Settings aria-hidden="true" size={16} />
                Admin
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
