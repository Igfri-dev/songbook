"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { signIn } from "next-auth/react";
import { ActionModal } from "@/components/ui/action-modal";

const subscribeToHydration = () => () => {};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  return (
    <form
      method="post"
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!hydrated || isPending) return;
        setError("");
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            const requestedUrl = new URL(callbackUrl, window.location.origin);
            const destination = requestedUrl.origin === window.location.origin
              ? `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`
              : "/admin";
            const result = await signIn("credentials", {
              identifier: String(formData.get("identifier") ?? ""),
              password: String(formData.get("password") ?? ""),
              redirect: false,
              callbackUrl: destination,
            });

            if (!result?.ok || result.error) {
              setError("Email, usuario o password incorrectos.");
              return;
            }

            // Keep navigation on this app's origin, even when the configured auth URL is stale.
            router.push(destination);
            router.refresh();
          } catch {
            setError("No se pudo conectar con el servidor. Intenta nuevamente.");
          }
        });
      }}
    >
      <label className="grid gap-2 text-sm font-medium text-stone-800">
        Email o usuario
        <input
          name="identifier"
          type="text"
          autoComplete="username"
          required
          className="h-11 rounded-md border border-stone-300 px-3 text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="Usuario o Correo"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-800">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-md border border-stone-300 px-3 text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="Contraseña"
        />
      </label>

      <button
        type="submit"
        disabled={!hydrated || isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        <LogIn aria-hidden="true" size={17} />
        {!hydrated ? "Cargando..." : isPending ? "Entrando..." : "Entrar"}
      </button>

      <noscript>
        <p className="text-sm text-rose-700">Activa JavaScript para iniciar sesión.</p>
      </noscript>

      <ActionModal
        open={Boolean(error)}
        title="No se pudo iniciar sesion"
        description={error}
        tone="error"
        confirmLabel="Entendido"
        onConfirm={() => setError("")}
      />
    </form>
  );
}
