import { getAuthSession } from "@/lib/auth";

export async function requirePanelSession() {
  const session = await getAuthSession();

  if (!session?.user?.role) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}

export async function requireAdminSession() {
  const session = await requirePanelSession();

  if (session?.user?.role !== "ADMIN") {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}

export function forbiddenResponse() {
  return Response.json({ error: "No tienes permisos para esta accion" }, { status: 403 });
}

export function unauthorizedResponse() {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}

export function validationResponse(error: unknown) {
  return Response.json({ error: "Datos invalidos", details: error }, { status: 400 });
}
