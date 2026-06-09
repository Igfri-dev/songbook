import type { ReactNode } from "react";

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-w-0 flex-1 overflow-x-clip bg-stone-50">
      <div className="mx-auto grid w-full max-w-[100rem] min-w-0 gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-700">Panel admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-stone-950">
            Gestion de Cancionero
          </h1>
        </div>
        {children}
      </div>
    </main>
  );
}
