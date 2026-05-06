import { requirePanelSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  let session;

  try {
    session = await requirePanelSession();
  } catch {
    return unauthorizedResponse();
  }

  const snapshot = await getAdminSnapshot();
  snapshot.currentUser = {
    id: Number(session.user?.id),
    role: session.user?.role ?? "USER",
  };

  return Response.json(snapshot);
}
