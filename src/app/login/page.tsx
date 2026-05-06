import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getAuthSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session?.user?.role) {
    redirect("/admin");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-stone-50 px-4 py-12">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-emerald-700">Panel privado</p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950">Ingresar a Cancionero</h1>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
