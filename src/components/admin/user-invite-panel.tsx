"use client";

import { useState, useTransition } from "react";
import { MailPlus, UserCheck, UserRoundX } from "lucide-react";
import type { AdminUser } from "@/lib/catalog";

type UserInvitePanelProps = {
  users: AdminUser[];
  onInvite: (email: string) => Promise<void>;
};

export function UserInvitePanel({ users, onInvite }: UserInvitePanelProps) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Usuarios</h2>
        <p className="mt-1 text-sm text-stone-600">
          Los usuarios pueden iniciar sesion con su correo o con el usuario derivado antes del @.
        </p>

        <div className="mt-5 grid gap-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="grid gap-3 rounded-lg border border-stone-200 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  {user.hasPassword ? (
                    <UserCheck aria-hidden="true" size={17} className="shrink-0 text-emerald-700" />
                  ) : (
                    <UserRoundX aria-hidden="true" size={17} className="shrink-0 text-amber-700" />
                  )}
                  <p className="truncate font-semibold text-stone-950">{user.name}</p>
                </div>
                <p className="mt-1 truncate text-sm text-stone-600">{user.email}</p>
                <p className="mt-1 text-xs font-medium text-stone-500">@{user.username}</p>
              </div>
              <span
                className={`inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-semibold ${
                  user.hasPassword
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {user.hasPassword ? "Activo" : "Invitado"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-stone-950">Crear usuario</h3>
        <form
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const nextEmail = email.trim();

            if (!nextEmail) {
              return;
            }

            startTransition(async () => {
              await onInvite(nextEmail);
              setEmail("");
            });
          }}
        >
          <label className="grid gap-2 text-sm font-medium text-stone-800">
            Correo
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="h-11 rounded-md border border-stone-300 px-3 text-stone-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="usuario@dominio.com"
            />
          </label>

          <button
            type="submit"
            disabled={isPending || !email.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            <MailPlus aria-hidden="true" size={17} />
            {isPending ? "Enviando..." : "Enviar invitacion"}
          </button>
        </form>
      </aside>
    </section>
  );
}
