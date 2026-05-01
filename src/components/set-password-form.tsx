"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { ActionModal } from "@/components/ui/action-modal";

export function SetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        const formData = new FormData(event.currentTarget);
        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirmPassword") ?? "");

        if (password !== confirmPassword) {
          setError("Las passwords no coinciden.");
          return;
        }

        startTransition(async () => {
          const response = await fetch("/api/users/set-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              name: String(formData.get("name") ?? ""),
              password,
            }),
          });

          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            setError(body?.error ?? "No se pudo crear la password.");
            return;
          }

          setDone(true);
        });
      }}
    >
      <label className="grid gap-2 text-sm font-medium text-stone-800">
        Nombre
        <input
          name="name"
          autoComplete="name"
          className="h-11 rounded-md border border-stone-300 px-3 text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="Tu nombre"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-800">
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11 rounded-md border border-stone-300 px-3 text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="Minimo 8 caracteres"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-800">
        Confirmar password
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11 rounded-md border border-stone-300 px-3 text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="Repite la password"
        />
      </label>

      <button
        type="submit"
        disabled={isPending || !token}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        <KeyRound aria-hidden="true" size={17} />
        {isPending ? "Guardando..." : "Crear password"}
      </button>

      {!token ? (
        <p className="text-sm text-rose-700">El enlace no incluye token de invitacion.</p>
      ) : null}

      <ActionModal
        open={Boolean(error)}
        title="No se pudo crear la password"
        description={error}
        tone="error"
        confirmLabel="Entendido"
        onConfirm={() => setError("")}
      />

      <ActionModal
        open={done}
        title="Password creada"
        description="Tu cuenta ya esta activa. Ahora puedes iniciar sesion con tu correo o usuario."
        tone="info"
        confirmLabel="Ir al login"
        onConfirm={() => {
          window.location.href = "/login";
        }}
      />

      {done ? (
        <Link href="/login" className="text-center text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Ir al login
        </Link>
      ) : null}
    </form>
  );
}
