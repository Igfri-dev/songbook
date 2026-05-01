import { Suspense } from "react";
import { SetPasswordForm } from "@/components/set-password-form";

export default function SetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-stone-50 px-4 py-12">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-emerald-700">Invitacion</p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950">Crear password</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Define tu password para activar el acceso al panel privado.
          </p>
        </div>
        <Suspense fallback={null}>
          <SetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
